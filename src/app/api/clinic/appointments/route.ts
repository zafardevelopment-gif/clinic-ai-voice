import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { enqueueBookingConfirmation } from '@/lib/reminders/enqueue-confirmation'

const APPT_SELECT = 'id, patient_id, appointment_date, appointment_time, status, reason, booked_via, patient_name, patient_phone, patients(full_name), doctors(full_name, specialization, consultation_fee)'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()
  const { data, error } = await db
    .from('appointments')
    .select(APPT_SELECT)
    .eq('clinic_id', clinicId)
    .order('appointment_date', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const body = await req.json()
  const db = getDb()

  // Check slot availability — no double booking for same doctor/date/time
  const { data: conflict } = await db
    .from('appointments')
    .select('id')
    .eq('doctor_id', body.doctor_id)
    .eq('appointment_date', body.appointment_date)
    .eq('appointment_time', body.appointment_time + ':00')
    .not('status', 'in', '("cancelled","no_show")')
    .single()

  if (conflict) {
    return NextResponse.json({ error: 'This time slot is already booked for the selected doctor.' }, { status: 409 })
  }

  const { data, error } = await db
    .from('appointments')
    .insert({
      clinic_id: clinicId,
      patient_id: body.patient_id,
      doctor_id: body.doctor_id,
      appointment_date: body.appointment_date,
      appointment_time: body.appointment_time + ':00',
      reason: body.reason || null,
      notes: body.notes || null,
      status: 'confirmed',
      booked_via: 'manual',
    })
    .select(APPT_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (data) {
    const { data: patientRow } = await db.from('patients').select('phone').eq('id', body.patient_id).maybeSingle()
    await enqueueBookingConfirmation({
      clinicId,
      appointmentId: (data as unknown as { id: string }).id,
      patientId: body.patient_id,
      toNumber: patientRow?.phone ?? null,
    })
  }

  return NextResponse.json(data)
}
