import 'dotenv/config'
import http from 'http'
import { WebSocketServer } from 'ws'
import { createSession, createSessionFromPhone, runTurn } from './agent.js'
import { transcribe, synthesize, detectTtsLanguage } from './sarvam.js'
import { handleRealtimeCall } from './realtime.js'

const PORT = process.env.PORT || 8080
// 'openai' = OpenAI Realtime (fast, natural). Anything else = Sarvam pipeline.
const VOICE_ENGINE = (process.env.VOICE_ENGINE || 'sarvam').toLowerCase()

// ── Silence / turn detection tuning ──────────────────────────────────────────
// Twilio sends 20ms mulaw frames (160 bytes) @ 8000 Hz. We accumulate frames
// while the caller speaks and fire a turn after a short trailing silence.
const FRAME_MS = 20
const SILENCE_MS = 600          // trailing pause that ends a caller turn
const MIN_SPEECH_MS = 200       // ignore blips shorter than this
const MAX_UTTERANCE_MS = 4000   // hard cap — Exotel noise keeps silenceMs=0 so
                                 // we rely on this to fire turns; keep it short
// Exotel phone-line noise floor is ~0.04–0.06 (logs show silenceMs stays 0
// because line noise never drops below threshold). Set SILENCE_THRESHOLD above
// the noise floor so a real pause registers, and MIN_SPEECH_MS low so short
// utterances still fire.
const SPEECH_THRESHOLD = 0.08   // clearly above Exotel line noise (~0.05)
const SILENCE_THRESHOLD = 0.06  // above noise floor — a genuine pause drops here

const server = http.createServer((req, res) => {
  // Health check for Render/hosting.
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('clinic-voice-worker ok')
})

const wss = new WebSocketServer({ server, path: undefined })

wss.on('connection', (ws, req) => {
  // ── OpenAI Realtime path: bridge Twilio <-> OpenAI and skip the Sarvam loop.
  if (VOICE_ENGINE === 'openai') {
    let pathCallId = (req?.url || '').split('/').filter(Boolean).pop() || null
    const onStart = async data => {
      let msg
      try { msg = JSON.parse(data.toString()) } catch { return }
      if (msg.event !== 'start') return
      ws.off('message', onStart) // hand the socket over to the realtime bridge
      const callId = msg.start.customParameters?.callId || pathCallId
      console.log('[ws] (openai) stream start, callId=', callId)
      if (!callId) { ws.close(); return }
      try {
        const session = await createSession(callId)
        handleRealtimeCall(ws, session)
        // Replay the start event so the bridge sees streamSid.
        ws.emit('message', data)
      } catch (err) {
        console.error('[ws] (openai) session init failed:', err.message)
        ws.close()
      }
    }
    ws.on('message', onStart)
    return
  }

  // ── Sarvam path (default) ───────────────────────────────────────────────────
  /** @type {null | object} */
  let session = null
  let streamSid = null   // Twilio: camelCase. Exotel: snake_case (stream_sid)
  let isExotel = false   // set true once we see Exotel's stream_sid field
  // Fallback: callId may also be in the path (/ws/<callId>); the 'start' event's
  // customParameters.callId takes precedence.
  let callId = (req?.url || '').split('/').filter(Boolean).pop() || null

  let speechFrames = []        // Buffers of mulaw while caller talks
  let speaking = false
  let silenceMs = 0
  let speechMs = 0
  let processing = false       // don't start a new turn while one is running
  let closed = false
  let framesSeen = 0           // diagnostics: total inbound frames
  let peakEnergy = 0           // diagnostics: loudest frame energy seen
  let botSpeaking = false      // ignore inbound audio while we're talking (echo)

  // Send PCM/mulaw audio back to the carrier.
  // Exotel (per official echobot github.com/exotel/voice-streaming):
  //   { event:'media', stream_sid, media:{ payload:<base64> } }  — ONLY these
  //   fields. No sequence_number/chunk/timestamp. Audio = raw slin 16-bit PCM
  //   @ 8kHz, chunks multiple of 320 bytes, PACED (not blasted all at once).
  // Twilio: { event:'media', streamSid, media:{ payload:<base64> } } per 160-byte frame.
  function sendAudio(pcmBuf) {
    if (closed) return
    if (isExotel) {
      // Pad to a multiple of 320 bytes with silence (Exotel requirement).
      if (pcmBuf.length % 320 !== 0) {
        pcmBuf = Buffer.concat([pcmBuf, Buffer.alloc(320 - (pcmBuf.length % 320))])
      }
      const CHUNK = 3200 // 100ms of slin @ 8kHz
      let offset = 0
      const sendNext = () => {
        if (closed || ws.readyState !== ws.OPEN) return
        const slice = pcmBuf.subarray(offset, offset + CHUNK)
        try {
          ws.send(JSON.stringify({
            event: 'media',
            stream_sid: streamSid,
            media: { payload: slice.toString('base64') },
          }))
        } catch (e) { return }
        offset += CHUNK
        if (offset < pcmBuf.length) setTimeout(sendNext, 100) // real-time pacing
      }
      sendNext()
    } else {
      // Twilio: per-frame 160-byte mulaw JSON
      const FRAME = 160
      for (let i = 0; i < pcmBuf.length; i += FRAME) {
        if (closed) return
        const payload = pcmBuf.subarray(i, i + FRAME).toString('base64')
        ws.send(JSON.stringify({ event: 'media', streamSid, media: { payload } }))
      }
    }
  }

  // Synthesize ONE chunk of text via Sarvam and stream it to Twilio, waiting
  // the real playback duration. Caller must hold botSpeaking around the whole
  // turn. Spoken language follows the text (Bengali/Tamil/etc.), Hindi fallback.
  async function speakChunk(text, pace = 1.0) {
    const t = (text || '').trim()
    if (!t || closed) return
    try {
      const ttsLang = detectTtsLanguage(t, session?.language || 'hi-IN')
      const audio = await synthesize(t, ttsLang, session?.speaker || 'anushka', pace)
      console.log(`[${callId}] speaking ${audio.length} bytes (${ttsLang}): ${t.slice(0, 40)}`)
      sendAudio(audio)
      // For Twilio: wait real playback time so botSpeaking blocks echo correctly.
      // For Exotel: Exotel buffers the full audio and plays it — we still wait
      // the same duration so we don't start listening before playback ends.
      // MP3 @ 128kbps = 16000 bytes/sec. mulaw: 8000 bytes/sec.
      const bytesPerSec = isExotel ? 16000 : 8000
      const playMs = Math.round((audio.length / bytesPerSec) * 1000) + 300
      await new Promise(r => setTimeout(r, playMs))
    } catch (err) {
      console.error('[ws] TTS failed:', err.message)
    }
  }

  // Speak a standalone line (greeting / error), managing botSpeaking itself.
  async function speak(text, pace = 1.0) {
    if (!text || closed) return
    botSpeaking = true
    try { await speakChunk(text, pace) } finally {
      botSpeaking = false
      speechFrames = []; speaking = false; speechMs = 0; silenceMs = 0
    }
  }

  async function handleUtterance() {
    if (processing || !session) return
    const frames = speechFrames
    speechFrames = []
    if (!frames.length) return
    processing = true
    botSpeaking = true // hold the mic for the whole turn (STT + reply playback)
    try {
      const audio = Buffer.concat(frames)
      const transcript = await transcribe(audio, 'unknown', isExotel ? 'pcm' : 'mulaw')
      if (!transcript) { return }
      console.log(`[${callId}] caller: ${transcript}`)
      const { reply, end } = await runTurn(session, transcript)
      console.log(`[${callId}] ai: ${reply}`)
      await speakChunk(reply) // one smooth audio clip for the whole reply
      if (end) {
        setTimeout(() => { try { ws.close() } catch {} }, 1200)
      }
    } catch (err) {
      console.error('[ws] utterance error:', err.message)
    } finally {
      botSpeaking = false
      speechFrames = []; speaking = false; speechMs = 0; silenceMs = 0
      processing = false
    }
  }

  ws.on('message', async data => {
    let msg
    try { msg = JSON.parse(data.toString()) } catch { return }

    switch (msg.event) {
      case 'start': {
        // Exotel sends stream_sid (snake_case) at top level.
        // Twilio sends streamSid (camelCase) inside msg.start.
        if (msg.stream_sid) {
          streamSid = msg.stream_sid
          isExotel = true
        } else {
          streamSid = msg.streamSid || msg.start?.streamSid
          isExotel = false
        }
        // Exotel also sends from/to at top level of msg.start
        const callerFrom = msg.start?.from || msg.start?.From || msg.start?.customParameters?.from || ''
        const callerTo   = msg.start?.to   || msg.start?.To   || msg.start?.customParameters?.to   || ''

        // callId from custom params, or from URL path.
        // If path was /ws (no callId), callId='ws' which is invalid — treat as missing.
        const rawCallId = msg.start?.customParameters?.callId || msg.start?.customParameters?.call_id || callId
        callId = (rawCallId && rawCallId !== 'ws') ? rawCallId : null

        // Log the FULL start message so we can see exactly what Exotel sends
        console.log('[ws] FULL start msg:', JSON.stringify(msg).slice(0, 800))
        console.log(`[ws] stream start — callId=${callId} from=${callerFrom} to=${callerTo} streamSid=${streamSid}`)

        try {
          if (callId) {
            // Normal Twilio path: callId pre-created by /api/voice/incoming-call
            session = await createSession(callId)
          } else {
            // Exotel VoiceBot path: no pre-created callId — look up clinic from
            // the dialed number (To) and create the call record on the fly.
            // If to/from aren't in the start event, createSessionFromPhone falls
            // back to the first active clinic (single-clinic deployments).
            session = await createSessionFromPhone(callerTo, callerFrom)
            callId = session?.callId
          }
          console.log(`[ws] session ready — clinic=${session?.clinicId} greeting="${(session?.greeting||'').slice(0,50)}"`)
          await speak(session.greeting, 0.9)
        } catch (err) {
          console.error('[ws] session init failed:', err?.message || err)
          // Fallback: still greet so the caller isn't left in silence.
          if (!session) {
            session = { callId, messages: [{ role: 'system', content: 'You are a clinic phone receptionist. Be brief and helpful.' }], doctors: [], language: 'hi-IN', speaker: 'anushka', greeting: 'Namaste! Aap clinic mein phone kiya hai. Main aapki kaise madad kar sakta hoon?' }
          }
          console.log('[ws] using fallback session, greeting now...')
          try { await speak(session.greeting) } catch (e2) { console.error('[ws] fallback speak failed:', e2.message) }
        }
        break
      }
      case 'media': {
        if (!session || processing || botSpeaking) return
        const buf = Buffer.from(msg.media.payload, 'base64')
        // Exotel sends 16-bit PCM (slin); Twilio sends mulaw. Use the right
        // energy function so silence detection works correctly.
        const energy = isExotel ? pcmEnergy(buf) : mulawEnergy(buf)
        framesSeen++
        if (energy > peakEnergy) peakEnergy = energy
        // Periodic energy log so we can tune the threshold from Render logs.
        if (framesSeen % 100 === 0) {
          console.log(`[${callId}] frames=${framesSeen} peakEnergy=${peakEnergy.toFixed(4)} speaking=${speaking} bufFrames=${speechFrames.length}`)
        }
        // While speaking, log live energy/silence so we can see the noise floor.
        if (speaking && speechMs % 500 === 0) {
          console.log(`[${callId}] speaking energy=${energy.toFixed(4)} silenceMs=${silenceMs} speechMs=${speechMs}`)
        }
        if (!speaking) {
          // Wait for clearly-above-noise energy to START a turn.
          if (energy > SPEECH_THRESHOLD) {
            speaking = true
            silenceMs = 0
            speechMs = FRAME_MS
            speechFrames = [buf]
          }
        } else {
          // While speaking, accumulate. A single loud frame (noise spike) must
          // NOT reset the whole silence timer — decay it instead, so a genuine
          // trailing pause still ends the turn even on a noisy line.
          speechFrames.push(buf)
          speechMs += FRAME_MS
          if (energy < SILENCE_THRESHOLD) {
            silenceMs += FRAME_MS
          } else {
            silenceMs = Math.max(0, silenceMs - FRAME_MS * 2) // decay, don't reset
          }
          // End the turn on a real trailing pause, OR when we hit the max cap.
          if (silenceMs >= SILENCE_MS || speechMs >= MAX_UTTERANCE_MS) {
            speaking = false
            const fire = speechMs - silenceMs >= MIN_SPEECH_MS
            console.log(`[${callId}] utterance end: speechMs=${speechMs} silenceMs=${silenceMs} firing=${fire}`)
            if (fire) handleUtterance()
            else speechFrames = []
            speechMs = 0
            silenceMs = 0
          }
        }
        break
      }
      case 'stop': {
        console.log('[ws] stream stop')
        ws.close()
        break
      }
    }
  })

  ws.on('close', () => { closed = true; console.log('[ws] closed', callId) })
  ws.on('error', e => console.error('[ws] error:', e.message))
})

// Approx normalized energy of an 8-bit mulaw frame (0..1).
function mulawEnergy(buf) {
  let sum = 0
  for (let i = 0; i < buf.length; i++) {
    const sample = mulawDecode(buf[i])
    sum += Math.abs(sample)
  }
  return sum / buf.length / 32768
}

// Decode one mulaw byte to a 16-bit PCM sample.
function mulawDecode(u) {
  u = ~u & 0xff
  const sign = u & 0x80
  const exponent = (u >> 4) & 0x07
  const mantissa = u & 0x0f
  let sample = ((mantissa << 3) + 0x84) << exponent
  sample -= 0x84
  return sign ? -sample : sample
}

// Energy of a 16-bit PCM (little-endian) buffer, normalized 0..1.
// Exotel sends slin (signed linear) 16-bit PCM @ 8kHz.
function pcmEnergy(buf) {
  if (buf.length < 2) return 0
  let sum = 0
  const samples = Math.floor(buf.length / 2)
  for (let i = 0; i < samples; i++) {
    const sample = buf.readInt16LE(i * 2)
    sum += Math.abs(sample)
  }
  return sum / samples / 32768
}

// Keep-alive: Render free tier spins down after ~15 min idle (50s+ cold start
// = dead air for callers). Self-ping every 10 min to stay awake.
const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL
if (SELF_URL) {
  setInterval(() => {
    fetch(`${SELF_URL.replace(/\/$/, '')}/health`).catch(() => {})
  }, 10 * 60 * 1000)
}

server.listen(PORT, () => console.log(`voice worker listening on :${PORT}`))
