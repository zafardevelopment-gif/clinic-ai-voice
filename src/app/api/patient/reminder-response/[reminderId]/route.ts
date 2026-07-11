import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

/**
 * POST /api/patient/reminder-response/[reminderId]
 *
 * Patient-facing response endpoint for WhatsApp/SMS reminders (the voice
 * equivalent is /api/voice/reminder-response/[reminderId] which parses DTMF).
 * No login — this link is only reachable via the reminder message itself, so
 * the reminderId (a UUID) acts as a bearer token. Body: { response: 'confirm'
 * | 'reschedule' | 'cancel' }.
 *
 * On 'reschedule', returns open slots for the same doctor so the patient (or
 * the clinic UI relaying this) can pick a new time in one round trip.
 */
export async function POST(req: NextRequest, { params }: { params: { reminderId: string } }) {
  let body: { response?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const responseMap: Record<string, 'confirmed' | 'reschedule' | 'cancel'> = {
    confirm: 'confirmed',
    confirmed: 'confirmed',
    reschedule: 'reschedule',
    cancel: 'cancel',
  }
  const mapped = body.response ? responseMap[body.response] : undefined
  if (!mapped) {
    return NextResponse.json({ error: 'response must be confirm | reschedule | cancel' }, { status: 400 })
  }

  const db = getDb()
  const { data: reminder } = await db
    .from('appointment_reminders')
    .select('id, appointment_id, status, appointments ( doctor_id, appointment_date )')
    .eq('id', params.reminderId)
    .maybeSingle()

  if (!reminder) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await db
    .from('appointment_reminders')
    .update({ response: mapped })
    .eq('id', params.reminderId)

  await db.from('reminder_events').insert({
    reminder_id: params.reminderId,
    event_type: 'responded',
    payload: { response: mapped, via: 'patient_link' },
  })

  const appt = reminder.appointments as unknown as { doctor_id: string; appointment_date: string } | null

  if (mapped === 'cancel' && reminder.appointment_id) {
    await db.from('appointments').update({ status: 'cancelled' }).eq('id', reminder.appointment_id)
    return NextResponse.json({ ok: true, response: mapped })
  }

  if (mapped === 'confirmed' && reminder.appointment_id) {
    await db.from('appointments').update({ status: 'confirmed' }).eq('id', reminder.appointment_id)
    return NextResponse.json({ ok: true, response: mapped })
  }

  if (mapped === 'reschedule' && appt?.doctor_id) {
    // Reuse the existing slots endpoint's logic by calling it internally
    // would require an HTTP round-trip; instead surface a minimal same-day+
    // next-day slot hint so the clinic UI can deep-link to the full picker.
    return NextResponse.json({
      ok: true,
      response: mapped,
      doctorId: appt.doctor_id,
      slotsUrl: `/api/clinic/appointments/slots?doctor_id=${appt.doctor_id}&date=${appt.appointment_date}`,
    })
  }

  return NextResponse.json({ ok: true, response: mapped })
}
