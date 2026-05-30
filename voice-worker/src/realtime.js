// OpenAI Realtime API bridge: Twilio Media Streams <-> OpenAI Realtime.
//
// OpenAI does speech-in -> reasoning -> speech-out over a single WebSocket,
// giving low latency + natural turn-taking + barge-in. We bridge raw audio
// between Twilio (mulaw 8k) and OpenAI, and expose a `book_appointment`
// function the model can call (reusing the same DB logic as the Sarvam path).

import WebSocket from 'ws'
import { tryBook, finalize } from './agent.js'

const OPENAI_URL =
  'wss://api.openai.com/v1/realtime?model=' +
  (process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview')

/**
 * Handle one Twilio call using OpenAI Realtime.
 * @param {WebSocket} twilioWs  the Twilio media-stream socket
 * @param {object} session      from createSession() (clinic ctx, doctors, etc.)
 */
export function handleRealtimeCall(twilioWs, session) {
  let streamSid = null
  let closed = false

  const oa = new WebSocket(OPENAI_URL, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'OpenAI-Beta': 'realtime=v1',
    },
  })

  // ── OpenAI connection ──────────────────────────────────────────────────────
  oa.on('open', () => {
    console.log(`[${session.callId}] OpenAI Realtime connected`)
    oa.send(JSON.stringify({
      type: 'session.update',
      session: {
        // Twilio uses g711 mulaw @ 8kHz both directions.
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        voice: process.env.OPENAI_REALTIME_VOICE || 'shimmer',
        instructions: session.realtimeInstructions,
        modalities: ['audio', 'text'],
        // Server-side VAD: OpenAI detects when the caller stops talking.
        turn_detection: { type: 'server_vad', silence_duration_ms: 500 },
        input_audio_transcription: { model: 'whisper-1' },
        tools: [BOOK_TOOL],
        tool_choice: 'auto',
      },
    }))
    // Greet first.
    oa.send(JSON.stringify({
      type: 'response.create',
      response: {
        instructions: `Greet the caller warmly in Hindi/Hinglish: "${session.greeting}"`,
      },
    }))
  })

  oa.on('message', async raw => {
    let evt
    try { evt = JSON.parse(raw.toString()) } catch { return }

    switch (evt.type) {
      // Audio chunk from OpenAI → forward to Twilio.
      case 'response.audio.delta': {
        if (evt.delta && streamSid && !closed) {
          twilioWs.send(JSON.stringify({
            event: 'media', streamSid, media: { payload: evt.delta },
          }))
        }
        break
      }
      // Caller transcript (for logging / call record).
      case 'conversation.item.input_audio_transcription.completed': {
        if (evt.transcript) console.log(`[${session.callId}] caller: ${evt.transcript.trim()}`)
        break
      }
      // Model finished a spoken response (text mirror, for logs).
      case 'response.audio_transcript.done': {
        if (evt.transcript) console.log(`[${session.callId}] ai: ${evt.transcript.trim()}`)
        break
      }
      // The model wants to call a function (book_appointment).
      case 'response.function_call_arguments.done': {
        await handleToolCall(evt)
        break
      }
      case 'error': {
        console.error(`[${session.callId}] OpenAI error:`, JSON.stringify(evt.error || evt))
        break
      }
    }
  })

  oa.on('close', () => { console.log(`[${session.callId}] OpenAI closed`); cleanup() })
  oa.on('error', e => console.error(`[${session.callId}] OpenAI ws error:`, e.message))

  // Run the booking tool, then tell OpenAI the result so it can speak it.
  async function handleToolCall(evt) {
    let args = {}
    try { args = JSON.parse(evt.arguments || '{}') } catch {}
    console.log(`[${session.callId}] tool book_appointment:`, JSON.stringify(args))
    const result = await tryBook(session, {
      patient_name: args.patient_name,
      doctor: args.doctor_or_department,
      date: args.appointment_date,
      time: args.appointment_time,
    })
    // Return the result to the model.
    oa.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: evt.call_id,
        output: JSON.stringify(result),
      },
    }))
    oa.send(JSON.stringify({ type: 'response.create' }))
  }

  // ── Twilio connection ──────────────────────────────────────────────────────
  twilioWs.on('message', data => {
    let msg
    try { msg = JSON.parse(data.toString()) } catch { return }
    switch (msg.event) {
      case 'start':
        streamSid = msg.start.streamSid
        break
      case 'media':
        // Caller audio (base64 mulaw) → OpenAI input buffer.
        if (oa.readyState === WebSocket.OPEN) {
          oa.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: msg.media.payload }))
        }
        break
      case 'stop':
        cleanup()
        break
    }
  })

  twilioWs.on('close', () => cleanup())
  twilioWs.on('error', e => console.error(`[${session.callId}] twilio ws error:`, e.message))

  function cleanup() {
    if (closed) return
    closed = true
    finalize(session).catch(() => {})
    try { oa.close() } catch {}
    try { twilioWs.close() } catch {}
  }
}

// Function the model calls once it has gathered booking details.
const BOOK_TOOL = {
  type: 'function',
  name: 'book_appointment',
  description:
    'Create an appointment once the caller has given their name, a doctor or department, a date, and a time, and has confirmed. Do not call until all four are known and confirmed.',
  parameters: {
    type: 'object',
    properties: {
      patient_name: { type: 'string', description: "Caller's full name" },
      doctor_or_department: { type: 'string', description: 'Doctor name or department from the clinic list' },
      appointment_date: { type: 'string', description: 'Date in YYYY-MM-DD' },
      appointment_time: { type: 'string', description: 'Time in 24h HH:MM' },
    },
    required: ['patient_name', 'doctor_or_department', 'appointment_date', 'appointment_time'],
  },
}
