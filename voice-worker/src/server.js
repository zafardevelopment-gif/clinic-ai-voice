import 'dotenv/config'
import http from 'http'
import { WebSocketServer } from 'ws'
import { createSession, runTurn } from './agent.js'
import { transcribe, synthesize, detectTtsLanguage } from './sarvam.js'

const PORT = process.env.PORT || 8080

// ── Silence / turn detection tuning ──────────────────────────────────────────
// Twilio sends 20ms mulaw frames (160 bytes) @ 8000 Hz. We accumulate frames
// while the caller speaks and fire a turn after a short trailing silence.
const FRAME_MS = 20
const SILENCE_MS = 700          // trailing pause that ends a caller turn
const MIN_SPEECH_MS = 240       // ignore blips shorter than this
const MAX_UTTERANCE_MS = 6000   // hard cap — force a turn so we never get stuck
// Hysteresis: real speech (from logs) is ~0.15–0.25; phone-line noise can sit
// just above a tiny floor. Use a higher bar to START speech and a lower bar to
// keep counting silence, so background hum doesn't reset the silence timer.
const SPEECH_THRESHOLD = 0.04   // energy above this = caller is speaking
const SILENCE_THRESHOLD = 0.025 // energy below this = silence (ends the turn)

const server = http.createServer((req, res) => {
  // Health check for Render/hosting.
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('clinic-voice-worker ok')
})

const wss = new WebSocketServer({ server, path: undefined })

wss.on('connection', (ws, req) => {
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

  // Speak text: synthesize via Sarvam and stream to Twilio. The spoken language
  // follows the reply text (so the AI can answer in Bengali, Tamil, etc.), with
  // Hindi as the fallback for scripts Sarvam TTS doesn't voice (e.g. Maithili).
  async function speak(text) {
    if (!text || closed) return
    botSpeaking = true
    try {
      const ttsLang = detectTtsLanguage(text, session?.language || 'hi-IN')
      const audio = await synthesize(text, ttsLang, session?.speaker || 'anushka')
      console.log(`[${callId}] speaking ${audio.length} bytes (${ttsLang})`)
      // Send all frames immediately; Twilio plays them at real time. Then keep
      // botSpeaking true for the actual playback duration (8000 bytes/sec for
      // mulaw @ 8kHz) plus a small tail, so we don't hear our own audio.
      sendAudio(audio)
      const playMs = Math.round((audio.length / 8000) * 1000) + 300
      await new Promise(r => setTimeout(r, playMs))
    } catch (err) {
      console.error('[ws] TTS failed:', err.message)
    } finally {
      botSpeaking = false
      // Reset VAD so the next caller turn starts clean.
      speechFrames = []
      speaking = false
      speechMs = 0
      silenceMs = 0
    }
  }

  async function handleUtterance() {
    if (processing || !session) return
    const frames = speechFrames
    speechFrames = []
    if (!frames.length) return
    processing = true
    try {
      const audio = Buffer.concat(frames)
      const transcript = await transcribe(audio, session.language === 'hi-IN' ? 'unknown' : 'unknown')
      if (!transcript) { processing = false; return }
      console.log(`[${callId}] caller: ${transcript}`)
      const { reply, end } = await runTurn(session, transcript)
      console.log(`[${callId}] ai: ${reply}`)
      await speak(reply)
      if (end) {
        // Give audio a moment to flush, then close.
        setTimeout(() => { try { ws.close() } catch {} }, 1500)
      }
    } catch (err) {
      console.error('[ws] utterance error:', err.message)
    } finally {
      processing = false
    }
  }

  ws.on('message', async data => {
    let msg
    try { msg = JSON.parse(data.toString()) } catch { return }

    switch (msg.event) {
      case 'start': {
        streamSid = msg.start.streamSid
        // callId is passed as a custom parameter from the <Stream> TwiML
        // (falls back to the path-derived id set on connection).
        callId = msg.start.customParameters?.callId || callId
        console.log('[ws] stream start, callId=', callId)
        if (!callId) { ws.close(); return }
        try {
          session = await createSession(callId)
          await speak(session.greeting)
        } catch (err) {
          console.error('[ws] session init failed:', err.message)
          ws.close()
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
