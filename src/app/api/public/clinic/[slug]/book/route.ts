import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { enqueueBookingConfirmation } from '@/lib/reminders/enqueue-confirmation'

// Public endpoint — no auth needed
// POST /api/public/clinic/[slug]/book
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params

  let body: {
    doctor_id: string
    appointment_date: string
    appointment_time: string
    patient_name: string
    patient_phone: string
    patient_email?: string
    notes?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { doctor_id, appointment_date, appointment_time, patient_name, patient_phone } = body

  if (!doctor_id || !appointment_date || !appointment_time || !patient_name || !patient_phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = getDb()

  // Verify clinic and doctor
  const { data: clinic } = await db
    .from('clinics')
    .select('id')
    .eq('website_slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const { data: doctor } = await db
    .from('doctors')
    .select('id, full_name, slot_duration_minutes')
    .eq('id', doctor_id)
    .eq('clinic_id', clinic.id)
    .eq('is_active', true)
    .single()

  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  // Check slot is not already booked (race condition guard)
  const { data: existing } = await db
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctor_id)
    .eq('appointment_date', appointment_date)
    .eq('appointment_time', appointment_time)
    .not('status', 'in', '("cancelled","no_show")')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This slot is already booked. Please choose another time.' }, { status: 409 })
  }

  // Find existing patient by phone, or create new one
  let patientId: string | null = null
  const { data: existingPatient } = await db
    .from('patients')
    .select('id')
    .eq('clinic_id', clinic.id)
    .eq('phone', patient_phone.trim())
    .maybeSingle()

  if (existingPatient) {
    patientId = existingPatient.id
  } else {
    const { data: newPatient } = await db
      .from('patients')
      .insert({
        clinic_id: clinic.id,
        full_name: patient_name.trim(),
        phone: patient_phone.trim(),
        email: body.patient_email || null,
      })
      .select('id')
      .single()
    if (newPatient) patientId = newPatient.id
  }

  // Create appointment
  const { data: appointment, error } = await db
    .from('appointments')
    .insert({
      clinic_id: clinic.id,
      doctor_id: doctor_id,
      patient_id: patientId,
      appointment_date,
      appointment_time,
      patient_name: patient_name.trim(),
      patient_phone: patient_phone.trim(),
      patient_email: body.patient_email || null,
      notes: body.notes || null,
      status: 'scheduled',
      booked_via: 'online',
    })
    .select('id')
    .single()

  if (error) {
    console.error('Booking error:', error)
    return NextResponse.json({ error: 'Booking failed. Please try again.' }, { status: 500 })
  }

  await enqueueBookingConfirmation({
    clinicId: clinic.id,
    appointmentId: appointment.id,
    patientId,
    toNumber: patient_phone.trim(),
  })

  return NextResponse.json({ success: true, appointment_id: appointment.id }, { status: 201 })
}
