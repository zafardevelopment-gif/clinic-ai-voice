/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getTelephonyProvider, readFormBody, type CallInstruction } from '@/lib/telephony'

/**
 * POST /api/voice/reminder-response/[reminderId]
 *
 * Carrier hits this endpoint with the DTMF digits the patient pressed.
 * We record the response and play a short confirmation back before hanging up.
 *
 * Twilio form fields: Digits, CallSid
 * Exotel form fields: Digits, CallSid
 *
 * For appointment_24h/2h reminders we also update the appointment status
 * directly when the patient asks to cancel — saves the clinic a manual step.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { reminderId: string } },
) {
  const provider = getTelephonyProvider()
  const { rawBody, params: formParams } = await readFormBody(req)

  const webhookUrl = `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/api/voice/reminder-response/${params.reminderId}`
  const verified = await provider.verifyWebhook({
    url: webhookUrl,
    headers: req.headers,
    rawBody,
    formParams,
  })
  if (!verified && process.env.NODE_ENV === 'production') {
    return xml(provider.buildResponse([{ kind: 'hangup' }]), 401)
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  const digits = (formParams.Digits || '').trim()
  const { data: reminder } = await db
    .from('appointment_reminders')
    .select('id, type, appointment_id, metadata')
    .eq('id', params.reminderId)
    .single()

  if (!reminder) {
    return xml(provider.buildResponse([{ kind: 'hangup' }]))
  }

  // Map DTMF → response enum + spoken reply.
  let response: 'confirmed' | 'reschedule' | 'cancel' | 'no_response' = 'no_response'
  let reply = 'Dhanyavaad. Namaste.'

  switch (digits) {
    case '1':
      response = 'confirmed'
      reply = reminder.type === 'post_visit'
        ? 'Theek hai, dhanyavaad. Namaste.'
        : 'Aapka appointment confirm ho gaya hai. Dhanyavaad. Namaste.'
      break
    case '2':
      response = 'reschedule'
      reply = reminder.type === 'post_visit'
        ? 'Theek hai, clinic se koi aapko thodi der mein call karega. Namaste.'
        : 'Theek hai, clinic se koi aapko thodi der mein call karke naya time set karega. Namaste.'
      break
    case '3':
      response = 'cancel'
      reply = 'Aapka appointment cancel kar diya gaya hai. Dhanyavaad.'
      break
  }

  // Persist response.
  await db
    .from('appointment_reminders')
    .update({
      response,
      dtmf_received: digits || null,
    })
    .eq('id', params.reminderId)

  // Auto-update appointment status on cancel (only for appointment reminders).
  if (response === 'cancel' && reminder.appointment_id) {
    await db
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', reminder.appointment_id)
  }

  const instructions: CallInstruction[] = [
    { kind: 'say', text: reply },
    { kind: 'hangup' },
  ]

  return xml(provider.buildResponse(instructions))
}

function xml(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}
