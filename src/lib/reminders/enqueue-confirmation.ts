import { getDb } from '@/lib/db'

/**
 * Queue an immediate "booking confirmed" reminder right after an appointment
 * is created. Fire-and-forget from the caller's perspective — booking should
 * never fail because a reminder couldn't be queued, so this never throws.
 */
export async function enqueueBookingConfirmation(args: {
  clinicId: string
  appointmentId: string
  patientId: string | null
  toNumber: string | null
}): Promise<void> {
  if (!args.patientId || !args.toNumber) return

  try {
    const db = getDb()
    await db.from('appointment_reminders').insert({
      clinic_id: args.clinicId,
      appointment_id: args.appointmentId,
      patient_id: args.patientId,
      type: 'booking_confirmation',
      channel: 'whatsapp',
      status: 'scheduled',
      to_number: args.toNumber,
      scheduled_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[enqueueBookingConfirmation] failed (non-fatal):', err)
  }
}
