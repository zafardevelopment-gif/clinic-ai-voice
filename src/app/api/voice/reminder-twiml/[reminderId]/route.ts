/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getTelephonyProvider, readFormBody, type CallInstruction } from '@/lib/telephony'

/**
 * POST /api/voice/reminder-twiml/[reminderId]
 *
 * The TwiML/ExoML endpoint that carriers hit AFTER the callee answers.
 * Returns XML telling the carrier what to say + how to gather DTMF input.
 *
 * Twilio sends `AnsweredBy=human|machine_start|...` (because we enabled
 * machineDetection in place-call.ts). If a machine picks up, we skip the
 * interactive prompt and just leave a short voicemail message.
 *
 * NOTE: This route is unauthenticated by design — carriers can't sign their
 * webhooks before they have a sid. The provider.verifyWebhook() guard still
 * runs to ensure it's actually Twilio/Exotel.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { reminderId: string } },
) {
  const provider = getTelephonyProvider()
  const { rawBody, params: formParams } = await readFormBody(req)

  // Verify webhook origin (Twilio HMAC / Exotel IP).
  const webhookUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/voice/reminder-twiml/${params.reminderId}`
  const verified = await provider.verifyWebhook({
    url: webhookUrl,
    headers: req.headers,
    rawBody,
    formParams,
  })
  if (!verified && process.env.NODE_ENV === 'production') {
    return xml(
      provider.buildResponse([{ kind: 'hangup' }]),
      401,
    )
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  const { data: reminder } = await db
    .from('appointment_reminders')
    .select(`id, type, spoken_script, clinic_id, clinics ( name )`)
    .eq('id', params.reminderId)
    .single()

  if (!reminder || !reminder.spoken_script) {
    return xml(
      provider.buildResponse([
        { kind: 'say', text: 'Sorry, this reminder could not be loaded. Goodbye.' },
        { kind: 'hangup' },
      ]),
    )
  }

  // Voicemail / answering machine branch — leave a short message and hang up.
  const answeredBy = (formParams.AnsweredBy || '').toLowerCase()
  if (answeredBy.includes('machine')) {
    await db
      .from('appointment_reminders')
      .update({
        response: 'no_response',
        metadata: { ...(reminder.metadata || {}), answered_by: 'machine' },
      })
      .eq('id', params.reminderId)

    return xml(
      provider.buildResponse([
        { kind: 'say', text: reminder.spoken_script },
        { kind: 'hangup' },
      ]),
    )
  }

  // Human pickup — speak the script, then gather DTMF.
  // Build a separate "press 1 to confirm" prompt so the script stays clean
  // for non-DTMF reminder types (birthday/post-visit/broadcast).
  const dtmfPrompt = buildDtmfPrompt(reminder.type)
  const responseUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/voice/reminder-response/${params.reminderId}`

  const instructions: CallInstruction[] = [
    { kind: 'say', text: reminder.spoken_script },
  ]

  if (dtmfPrompt) {
    instructions.push({
      kind: 'gather',
      prompt: dtmfPrompt,
      timeoutSec: 6,
      actionUrl: responseUrl,
    })
    // If the gather times out, fall through to a polite goodbye.
    instructions.push({ kind: 'say', text: 'Theek hai, dhanyavaad. Namaste.' })
  }

  instructions.push({ kind: 'hangup' })
  return xml(provider.buildResponse(instructions))
}

/** Reminder types that ask for DTMF input. Others just speak and hang up. */
function buildDtmfPrompt(type: string): string | null {
  switch (type) {
    case 'appointment_24h':
    case 'appointment_2h':
      return 'Confirm karne ke liye 1 dabayein. Reschedule ke liye 2. Cancel ke liye 3.'
    case 'post_visit':
      return 'Agar aap theek hain, 1 dabayein. Koi problem ho to 2 dabayein, hum aapko clinic se connect karenge.'
    case 'annual_checkup':
      return 'Naya appointment book karne ke liye 1 dabayein.'
    case 'birthday':
    case 'broadcast':
      return null  // No input required — just deliver the message.
    default:
      return null
  }
}

function xml(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}
