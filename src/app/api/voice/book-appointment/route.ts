/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * POST /api/voice/book-appointment
 *
 * Called by the AI agent to book an appointment after intent confirmation.
 * Validates availability, creates the appointment, and updates the call record.
 *
 * Body:
 *   {
 *     call_id:           string
 *     clinic_id:         string
 *     patient_id?:       string       -- if known; otherwise creates new patient
 *     patient_name?:     string       -- required if patient_id is null
 *     patient_phone?:    string       -- required if patient_id is null
 *     doctor_id:         string
 *     appointment_date:  string       -- YYYY-MM-DD
 *     appointment_time:  string       -- HH:MM
 *     reason?:           string
 *   }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  ) as any

  try {
    const body = await req.json()
    const {
      call_id, clinic_id, patient_id, patient_name, patient_phone,
      doctor_id, appointment_date, appointment_time, reason,
    } = body

    if (!call_id || !clinic_id || !doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify doctor belongs to this clinic
    const { data: doctor } = await supabase
      .from('doctors')
      .select('id, full_name, slot_duration_minutes, booking_min_hours, booking_max_days, is_active')
      .eq('id', doctor_id)
      .eq('clinic_id', clinic_id)
      .single()

    if (!doctor || !doctor.is_active) {
      return NextResponse.json({ error: 'Doctor not found or inactive' }, { status: 404 })
    }

    // Check booking window constraints
    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`)
    const now = new Date()
    const hoursUntilAppt = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    const daysUntilAppt = hoursUntilAppt / 24

    if (hoursUntilAppt < doctor.booking_min_hours) {
      return NextResponse.json({
        error: `Appointment must be at least ${doctor.booking_min_hours} hours in advance`,
        booked: false,
      }, { status: 400 })
    }

    if (daysUntilAppt > doctor.booking_max_days) {
      return NextResponse.json({
        error: `Appointment cannot be more than ${doctor.booking_max_days} days in advance`,
        booked: false,
      }, { status: 400 })
    }

    // Check for conflicting appointment
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time + ':00')
      .in('status', ['scheduled', 'confirmed'])
      .single()

    if (conflict) {
      return NextResponse.json({ error: 'That slot is already taken', booked: false }, { status: 409 })
    }

    // Create patient if not provided
    let resolvedPatientId = patient_id
    if (!resolvedPatientId) {
      if (!patient_name || !patient_phone) {
        return NextResponse.json({ error: 'patient_name and patient_phone required for new patient' }, { status: 400 })
      }
      // Try to find existing patient by phone
      const { data: existing } = await supabase
        .from('patients')
        .select('id')
        .eq('clinic_id', clinic_id)
        .eq('phone', patient_phone)
        .single()

      if (existing) {
        resolvedPatientId = existing.id
      } else {
        const { data: newPatient, error: patErr } = await supabase
          .from('patients')
          .insert({ clinic_id, full_name: patient_name, phone: patient_phone })
          .select('id')
          .single()
        if (patErr || !newPatient) {
          return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 })
        }
        resolvedPatientId = newPatient.id

        // Link patient to call
        await supabase.from('calls').update({ patient_id: resolvedPatientId }).eq('id', call_id)
      }
    }

    // Book the appointment
    const { data: appointment, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        clinic_id,
        patient_id: resolvedPatientId,
        doctor_id,
        appointment_date,
        appointment_time: appointment_time + ':00',
        duration_minutes: doctor.slot_duration_minutes,
        status: 'scheduled',
        reason: reason || null,
        booked_via: 'ai_voice',
      })
      .select()
      .single()

    if (apptErr || !appointment) {
      console.error('Failed to book appointment:', apptErr)
      return NextResponse.json({ error: 'Failed to book appointment' }, { status: 500 })
    }

    // Update call outcome
    await supabase.from('calls').update({ outcome: 'booked', call_type: 'booking' }).eq('id', call_id)

    return NextResponse.json({
      booked: true,
      appointment_id: appointment.id,
      appointment: {
        date: appointment.appointment_date,
        time: appointment.appointment_time.slice(0, 5),
        doctor: doctor.full_name,
        duration: doctor.slot_duration_minutes,
      },
      confirmation_message: `Your appointment with ${doctor.full_name} is confirmed for ${appointment_date} at ${appointment_time}.`,
    }, { status: 201 })

  } catch (err) {
    console.error('/api/voice/book-appointment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
