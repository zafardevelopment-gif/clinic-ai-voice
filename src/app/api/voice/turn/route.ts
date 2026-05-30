/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  getTelephonyProvider,
  readFormBody,
  type CallInstruction,
} from '@/lib/telephony'
import { chatCompletion, type LlmMessage } from '@/lib/ai/openrouter'

/**
 * POST /api/voice/turn?callId=<uuid>
 *
 * The conversational loop for <Gather>-mode voice calls.
 *
 * Twilio plays the greeting (from /api/voice/incoming-call) inside a <Gather>
 * whose `action` points here. When the caller speaks, Twilio POSTs the
 * speech-to-text result (SpeechResult) to this route. We:
 *
 *   1. Read the caller's transcript.
 *   2. Load clinic + recent conversation history for context.
 *   3. Ask the LLM (acting as the clinic receptionist) for a reply.
 *   4. Persist both turns to the conversations table.
 *   5. Return TwiML that SAYS the reply and opens another <Gather> so the
 *      conversation continues — until the caller hangs up or goes silent.
 */

const MAX_TURNS = 12 // safety cap so a call can't loop forever

export async function POST(req: NextRequest) {
  const provider = getTelephonyProvider()
  const callId = req.nextUrl.searchParams.get('callId') || ''
  const turnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice/turn?callId=${callId}`

  // Any unexpected error must NOT 500 — that makes Twilio hang up the call.
  // Instead, re-prompt so the conversation can recover.
  try {
    return await handleTurn(req, provider, callId)
  } catch (err) {
    console.error('[voice/turn] unexpected error, re-prompting:', err)
    return xml(
      provider.buildResponse([
        {
          kind: 'gather',
          prompt: 'Sorry, could you please say that again?',
          language: 'en-IN',
          timeoutSec: 5,
          actionUrl: turnUrl,
        },
      ]),
    )
  }
}

async function handleTurn(
  req: NextRequest,
  provider: ReturnType<typeof getTelephonyProvider>,
  callId: string,
) {
  const { rawBody, params } = await readFormBody(req)

  // Verify the request really came from Twilio (production only).
  const webhookUrl =
    (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') +
    `/api/voice/turn?callId=${callId}`
  const verified = await provider.verifyWebhook({
    url: webhookUrl,
    headers: req.headers,
    rawBody,
    formParams: params,
  })
  if (!verified && process.env.NODE_ENV === 'production') {
    return xml(
      provider.buildResponse([
        { kind: 'say', text: 'Sorry, we could not verify this call.' },
        { kind: 'hangup' },
      ]),
      401,
    )
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  if (!callId) {
    return xml(
      provider.buildResponse([
        { kind: 'say', text: 'Sorry, something went wrong. Goodbye.' },
        { kind: 'hangup' },
      ]),
    )
  }

  // Load the call → clinic → voice config.
  const { data: call } = await supabase
    .from('calls')
    .select('id, clinic_id, clinics(name), patients(full_name)')
    .eq('id', callId)
    .single()

  if (!call) {
    return xml(
      provider.buildResponse([
        { kind: 'say', text: 'Sorry, this call could not be found. Goodbye.' },
        { kind: 'hangup' },
      ]),
    )
  }

  const { data: agentConfig } = await supabase
    .from('voice_agent_config')
    .select('*')
    .eq('clinic_id', call.clinic_id)
    .single()

  const language = agentConfig?.language || 'en-IN'
  const clinicName = (call.clinics as { name: string } | null)?.name || 'the clinic'
  const patientName =
    (call.patients as { full_name: string } | null)?.full_name || null

  const transcript = (params.SpeechResult || '').trim()
  const turnUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice/turn?callId=${callId}`

  // Caller stayed silent → re-prompt once, then they can speak again.
  if (!transcript) {
    return xml(
      provider.buildResponse([
        {
          kind: 'gather',
          prompt: 'Sorry, I did not catch that. Could you please say it again?',
          language,
          timeoutSec: agentConfig?.silence_timeout_sec || 5,
          actionUrl: turnUrl,
        },
      ]),
    )
  }

  // Load existing conversation history for context (oldest first).
  const { data: history } = await supabase
    .from('conversations')
    .select('speaker, message')
    .eq('call_id', callId)
    .order('timestamp', { ascending: true })

  const turnsSoFar = (history?.length || 0) / 2
  if (turnsSoFar >= MAX_TURNS) {
    await saveTurns(supabase, callId, transcript, null)
    return xml(
      provider.buildResponse([
        {
          kind: 'say',
          text: 'Thank you for calling. Our team will follow up with you shortly. Goodbye.',
          language,
        },
        { kind: 'hangup' },
      ]),
    )
  }

  // Build the LLM conversation.
  const messages: LlmMessage[] = [
    { role: 'system', content: systemPrompt(clinicName, patientName, agentConfig) },
  ]
  for (const h of history || []) {
    messages.push({
      role: h.speaker === 'ai' ? 'assistant' : 'user',
      content: h.message,
    })
  }
  messages.push({ role: 'user', content: transcript })

  let reply: string
  try {
    const result = await chatCompletion(messages, {
      withFallback: true,
      temperature: 0.4,
      maxTokens: 180,
    })
    reply =
      result.content ||
      'I am sorry, I did not understand. Could you repeat that please?'
  } catch (err) {
    console.error('[voice/turn] LLM failed:', err)
    reply =
      'I am having trouble right now. Let me connect you to our front desk. Please hold.'
  }

  // Persist both turns.
  await saveTurns(supabase, callId, transcript, reply)

  // Decide whether to end the call. The model signals completion by ending
  // its reply with the token [END]; we strip it before speaking.
  const shouldEnd = /\[END\]\s*$/i.test(reply)
  const spoken = reply.replace(/\[END\]\s*$/i, '').trim()

  const instructions: CallInstruction[] = shouldEnd
    ? [
        { kind: 'say', text: spoken, language },
        { kind: 'hangup' },
      ]
    : [
        {
          kind: 'gather',
          prompt: spoken,
          language,
          timeoutSec: agentConfig?.silence_timeout_sec || 5,
          actionUrl: turnUrl,
        },
      ]

  return xml(provider.buildResponse(instructions))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function xml(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

async function saveTurns(
  supabase: any,
  callId: string,
  userMsg: string,
  aiMsg: string | null,
) {
  const rows: Array<{ call_id: string; speaker: string; message: string }> = [
    { call_id: callId, speaker: 'user', message: userMsg },
  ]
  if (aiMsg) rows.push({ call_id: callId, speaker: 'ai', message: aiMsg })
  const { error } = await supabase.from('conversations').insert(rows)
  if (error) console.error('[voice/turn] failed to save conversation:', error)
}

function systemPrompt(
  clinicName: string,
  patientName: string | null,
  cfg: any,
): string {
  const hours =
    cfg?.working_hours_start && cfg?.working_hours_end
      ? `Clinic hours are ${cfg.working_hours_start} to ${cfg.working_hours_end}.`
      : ''
  const caller = patientName ? `The caller is ${patientName}.` : ''
  return [
    `You are the friendly AI phone receptionist for "${clinicName}".`,
    `You are speaking on a live phone call, so keep every reply short (1-2 sentences), warm, and easy to understand when spoken aloud.`,
    `You can help callers with: booking or rescheduling appointments, clinic timings, location, services, and general questions.`,
    `If the caller asks to book an appointment, collect their name, preferred doctor or department, and preferred date/time, then confirm you will arrange it and the clinic will text them a confirmation.`,
    `If it sounds like a medical emergency, tell them to hang up and call emergency services immediately.`,
    `Do not invent specific doctor names, prices, or availability you were not told. If unsure, say the front desk will follow up.`,
    `You may reply in English, Hindi, or Hinglish to match the caller.`,
    hours,
    caller,
    `When the caller's request is fully handled and they have nothing else, end your final reply with the token [END] (the system removes it before speaking).`,
  ]
    .filter(Boolean)
    .join(' ')
}
