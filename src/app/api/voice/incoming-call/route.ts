/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import {
  getTelephonyProvider,
  readFormBody,
  type CallInstruction,
} from '@/lib/telephony'

/**
 * POST /api/voice/incoming-call
 *
 * Inbound call webhook hit by Twilio (dev) or Exotel (prod). Returns
 * TwiML/ExoML XML telling the carrier what to do.
 *
 * Flow:
 *   1. Verify signature / IP (per provider).
 *   2. Look up clinic by dialed number → load voice_agent_config.
 *   3. If agent disabled or out-of-hours → say message + optional forward.
 *   4. Otherwise create a call record and (when worker is deployed) connect
 *      the carrier to the voice WebSocket worker. Until the worker exists,
 *      we play the greeting + collect speech via <Gather>.
 *
 * Notes:
 *   - Caller (Twilio/Exotel) sends application/x-www-form-urlencoded,
 *     NOT JSON. The old JSON shape is kept as a legacy fallback for any
 *     internal callers that still POST JSON.
 */
export async function POST(req: NextRequest) {
  const provider = getTelephonyProvider()
  const contentType = req.headers.get('content-type') || ''

  // ── Legacy JSON path (kept so old internal callers don't break) ────────
  if (contentType.includes('application/json')) {
    return handleLegacyJson(req)
  }

  // ── Real telephony webhook (form-urlencoded XML response) ──────────────
  const { rawBody, params } = await readFormBody(req)

  const webhookUrl =
    (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') +
    '/api/voice/incoming-call'

  const verified = await provider.verifyWebhook({
    url: webhookUrl,
    headers: req.headers,
    rawBody,
    formParams: params,
  })

  if (!verified && process.env.NODE_ENV === 'production') {
    return xmlResponse(
      provider.buildResponse([
        { kind: 'say', text: 'Webhook signature could not be verified.' },
        { kind: 'hangup' },
      ]),
      401,
    )
  }

  const incoming = provider.parseIncomingCall(params)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  // 1. Find clinic. Routing depends on whether this is a forwarded call:
  //    - Forwarded call → ForwardedFrom header carries the clinic's original
  //      public number; look up by forwarded_from_number (Mode 1).
  //    - Direct call → the dialed number is a Twilio number owned by either
  //      the platform LLP or the clinic itself; look up by twilio_number
  //      (Mode 2/3). Falls back to `phone` for legacy rows.
  const forwardedFrom = (params.ForwardedFrom || '').trim()
  const dialedNumber = incoming.to

  let clinic: { id: string; name: string; is_active: boolean } | null = null

  if (forwardedFrom) {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('forwarded_from_number', forwardedFrom)
      .eq('is_active', true)
      .single()
    clinic = data
  }

  if (!clinic) {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('twilio_number', dialedNumber)
      .eq('is_active', true)
      .single()
    clinic = data
  }

  if (!clinic) {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('phone', dialedNumber)
      .eq('is_active', true)
      .single()
    clinic = data
  }

  if (!clinic) {
    return xmlResponse(
      provider.buildResponse([
        {
          kind: 'say',
          text: 'Sorry, this number is not configured. Please try again later.',
        },
        { kind: 'hangup' },
      ]),
    )
  }

  // 2. Voice agent config + working hours check.
  const { data: agentConfig } = await supabase
    .from('voice_agent_config')
    .select('*')
    .eq('clinic_id', clinic.id)
    .single()

  if (!agentConfig?.is_enabled) {
    return xmlResponse(
      provider.buildResponse(
        agentConfig?.fallback_phone
          ? [{ kind: 'dial', number: agentConfig.fallback_phone }]
          : [
              {
                kind: 'say',
                text: 'Our AI assistant is currently unavailable. Please call back later.',
              },
              { kind: 'hangup' },
            ],
      ),
    )
  }

  if (!isWithinWorkingHours(agentConfig)) {
    return xmlResponse(
      provider.buildResponse(
        agentConfig.fallback_phone
          ? [
              {
                kind: 'say',
                text: 'Connecting you to our front desk.',
              },
              { kind: 'dial', number: agentConfig.fallback_phone },
            ]
          : [
              {
                kind: 'say',
                text: `We are closed at the moment. Please call between ${agentConfig.working_hours_start} and ${agentConfig.working_hours_end}.`,
              },
              { kind: 'hangup' },
            ],
      ),
    )
  }

  // 3. Identify patient by caller number (best-effort, optional).
  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name')
    .eq('clinic_id', clinic.id)
    .eq('phone', incoming.from)
    .single()

  // 4. Create call record so the rest of the agent can attach turns to it.
  const { data: call, error: callErr } = await supabase
    .from('calls')
    .insert({
      clinic_id: clinic.id,
      phone_number: incoming.from,
      patient_id: patient?.id || null,
      call_type: 'query',
    })
    .select('id')
    .single()

  if (callErr || !call) {
    console.error('[incoming-call] failed to create call record:', callErr)
    return xmlResponse(
      provider.buildResponse([
        {
          kind: 'say',
          text: 'We are having trouble right now. Please try again in a few minutes.',
        },
        { kind: 'hangup' },
      ]),
    )
  }

  // 5. Build response.
  //    - If a voice worker WebSocket is configured, hand the audio off to it.
  //    - Otherwise fall back to <Gather> mode: play greeting, collect speech,
  //      and post it to /api/voice/process-intent on the next turn.
  const greeting =
    agentConfig.greeting_message ||
    `Hello, you've reached ${clinic.name}. How can I help you today?`

  const instructions: CallInstruction[] = process.env.VOICE_WORKER_URL
    ? [
        {
          kind: 'connectStream',
          wsUrl: `${process.env.VOICE_WORKER_URL.replace(/\/$/, '')}/ws/${call.id}`,
          metadata: {
            callId: call.id,
            clinicId: clinic.id,
            patientId: patient?.id || '',
          },
        },
      ]
    : [
        {
          kind: 'gather',
          prompt: greeting,
          language: agentConfig.language || 'en-IN',
          timeoutSec: agentConfig.silence_timeout_sec || 5,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/voice/turn?callId=${call.id}`,
        },
      ]

  return xmlResponse(provider.buildResponse(instructions))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function xmlResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

function isWithinWorkingHours(cfg: any): boolean {
  const now = new Date()
  const day = now.getDay()
  const minutes = now.getHours() * 60 + now.getMinutes()
  const workingDays: number[] = cfg.working_days || []
  if (!workingDays.includes(day)) return false

  const [sH, sM] = (cfg.working_hours_start as string).split(':').map(Number)
  const [eH, eM] = (cfg.working_hours_end as string).split(':').map(Number)
  return minutes >= sH * 60 + sM && minutes <= eH * 60 + eM
}

/**
 * Legacy JSON handler — preserved so existing internal callers (test scripts,
 * any custom UI) keep working. Returns the old `{ action, ... }` shape.
 */
async function handleLegacyJson(req: NextRequest): Promise<NextResponse> {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  const { clinic_phone, caller_phone, forwarded_from } = await req.json()
  if (!clinic_phone || !caller_phone) {
    return NextResponse.json(
      { error: 'clinic_phone and caller_phone are required' },
      { status: 400 },
    )
  }

  let clinic: { id: string; name: string; is_active: boolean } | null = null

  if (forwarded_from) {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('forwarded_from_number', forwarded_from)
      .eq('is_active', true)
      .single()
    clinic = data
  }

  if (!clinic) {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('twilio_number', clinic_phone)
      .eq('is_active', true)
      .single()
    clinic = data
  }

  if (!clinic) {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('phone', clinic_phone)
      .eq('is_active', true)
      .single()
    clinic = data
  }

  if (!clinic) {
    return NextResponse.json(
      { error: 'Clinic not found', action: 'hangup' },
      { status: 404 },
    )
  }

  const { data: agentConfig } = await supabase
    .from('voice_agent_config')
    .select('*')
    .eq('clinic_id', clinic.id)
    .single()

  if (!agentConfig?.is_enabled) {
    return NextResponse.json({
      action: 'fallback',
      message: 'AI agent is not enabled',
      fallback_phone: agentConfig?.fallback_phone || null,
    })
  }

  if (!isWithinWorkingHours(agentConfig)) {
    return NextResponse.json({
      action: 'out_of_hours',
      message: 'Outside working hours',
      working_hours: {
        start: agentConfig.working_hours_start,
        end: agentConfig.working_hours_end,
      },
      fallback_phone: agentConfig.fallback_phone || null,
    })
  }

  const { data: patient } = await supabase
    .from('patients')
    .select('id, full_name')
    .eq('clinic_id', clinic.id)
    .eq('phone', caller_phone)
    .single()

  const { data: call, error: callErr } = await supabase
    .from('calls')
    .insert({
      clinic_id: clinic.id,
      phone_number: caller_phone,
      patient_id: patient?.id || null,
      call_type: 'query',
    })
    .select()
    .single()

  if (callErr || !call) {
    return NextResponse.json(
      { error: 'Failed to create call record' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    action: 'start_agent',
    call_id: call.id,
    clinic: { id: clinic.id, name: clinic.name },
    patient: patient ? { id: patient.id, name: patient.full_name } : null,
    agent_config: {
      voice_type: agentConfig.voice_type,
      language: agentConfig.language,
      greeting_message: agentConfig.greeting_message,
      max_duration: agentConfig.max_call_duration_seconds,
      booking_rules: agentConfig.booking_rules,
    },
  })
}
