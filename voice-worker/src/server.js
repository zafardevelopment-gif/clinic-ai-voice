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
const MAX_UTTERANCE_MS = 8000   // hard cap — force a turn so we never get stuck
// Exotel phone-line noise floor sits around 0.03–0.06 in logs (silenceMs=0
// means noise never drops below SILENCE_THRESHOLD). Lower both thresholds so
// background hum triggers speech-start at a reasonable level AND the trailing
// silence actually fires.
const SPEECH_THRESHOLD = 0.06   // energy above this = caller is speaking
const SILENCE_THRESHOLD = 0.05  // energy below this = silence (ends the turn)

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
  let streamSid = null
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

  // Stream mulaw audio back to Twilio as outbound media. Split into 160-byte
  // (20ms) frames — but DON'T pace them: Twilio buffers and plays at real time
  // on its side. Sending all frames immediately means the reply starts playing
  // right away instead of dribbling out over many seconds.
  function sendAudio(mulawBuf) {
    if (!streamSid || closed) return
    const FRAME = 160
    for (let i = 0; i < mulawBuf.length; i += FRAME) {
      if (closed) return
      const payload = mulawBuf.subarray(i, i + FRAME).toString('base64')
      ws.send(JSON.stringify({ event: 'media', streamSid, media: { payload } }))
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
      const playMs = Math.round((audio.length / 8000) * 1000) + 120
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
      const transcript = await transcribe(audio, 'unknown')
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
        // Exotel VoiceBot sends streamSid at the TOP LEVEL (msg.streamSid).
        // Twilio nests it inside msg.start.streamSid. Support both.
        streamSid = msg.streamSid || msg.start?.streamSid
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
        const energy = mulawEnergy(buf)
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

server.listen(PORT, () => console.log(`voice worker listening on :${PORT}`))
