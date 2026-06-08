/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getTelephonyProvider } from '@/lib/telephony'
import { checkFeature, recordCallUsage, type FeatureKey } from '@/lib/billing/feature-gate'
import { generateReminderScript, type ReminderType } from './script-generator'

/**
 * Place a single reminder call for an already-queued appointment_reminders row.
 *
 * Flow:
 *   1. Load the reminder + related clinic / patient / appointment data.
 *   2. Verify the feature is still allowed (plan / override / clinic toggle / quota).
 *   3. Generate the spoken script (template or LLM).
 *   4. Save the script onto the row BEFORE dialing so the TwiML route can read it.
 *   5. Ask the telephony provider to dial.
 *   6. Persist provider_call_sid + flip status to in_progress.
 *   7. Increment subscription call usage.
 *
 * Returns the updated row (or throws on failure with the reason stored on
 * the row so admin can see what happened).
 */

const TYPE_TO_FEATURE: Record<ReminderType, FeatureKey> = {
  appointment_24h: 'appointment_24h',
  appointment_2h: 'appointment_2h',
  post_visit: 'post_visit',
  birthday: 'birthday',
  annual_checkup: 'annual_checkup',
  broadcast: 'broadcast',
}

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

export interface PlaceCallResult {
  reminderId: string
  ok: boolean
  reason?: string
  callSid?: string
}

export async function placeReminderCall(reminderId: string): Promise<PlaceCallResult> {
  const db = admin()
  const provider = getTelephonyProvider()

  // 1. Load reminder with joined context.
  const { data: reminder, error } = await db
    .from('appointment_reminders')
    .select(`
      id, clinic_id, appointment_id, patient_id, type, status, to_number, attempt,
      clinics ( id, name, phone ),
      patients ( id, full_name ),
      appointments ( id, appointment_date, appointment_time, doctors ( id, full_name ) )
    `)
    .eq('id', reminderId)
    .single()

  if (error || !reminder) {
    return { reminderId, ok: false, reason: `not_found: ${error?.message ?? ''}` }
  }

  if (reminder.status !== 'scheduled') {
    return { reminderId, ok: false, reason: `not_scheduled (status=${reminder.status})` }
  }

  // 2. Feature gate (plan / override / clinic toggle / quota).
  const featureKey = TYPE_TO_FEATURE[reminder.type as ReminderType]
  const gate = await checkFeature(reminder.clinic_id, featureKey, { consumesCall: true })
  if (!gate.enabled) {
    await db
      .from('appointment_reminders')
      .update({
        status: 'cancelled',
        error_message: `feature_blocked: ${gate.blockedReason}`,
      })
      .eq('id', reminderId)
    return { reminderId, ok: false, reason: `blocked: ${gate.blockedReason}` }
  }

  // 3. Generate the script.
  const clinic = reminder.clinics as any
  const patient = reminder.patients as any
  const appt = reminder.appointments as any
  const doctor = appt?.doctors as any

  // Load clinic-specific template override (if any) + reminder settings for
  // language / voice.
  const { data: settings } = await db
    .from('reminder_settings')
    .select(`
      language, voice_id,
      template_appointment_24h, template_appointment_2h,
      template_post_visit, template_birthday
    `)
    .eq('clinic_id', reminder.clinic_id)
    .maybeSingle()

  const templateMap: Partial<Record<ReminderType, string | null>> = {
    appointment_24h: settings?.template_appointment_24h ?? null,
    appointment_2h: settings?.template_appointment_2h ?? null,
    post_visit: settings?.template_post_visit ?? null,
    birthday: settings?.template_birthday ?? null,
  }

  const script = await generateReminderScript({
    type: reminder.type as ReminderType,
    language: settings?.language ?? 'hi-IN',
    patientName: patient?.full_name ?? 'Sir',
    clinicName: clinic?.name ?? 'the clinic',
    doctorName: doctor?.full_name,
    appointmentDateText: appt?.appointment_date,
    appointmentTimeText: formatTimeForSpeech(appt?.appointment_time),
    template: templateMap[reminder.type as ReminderType],
  })

  // 4. Save script BEFORE dialing — the TwiML route fetches it from here.
  await db
    .from('appointment_reminders')
    .update({ spoken_script: script })
    .eq('id', reminderId)

  // 5. Decide caller ID. Use clinic phone if present, else env fallback.
  const fromNumber =
    clinic?.phone ||
    process.env.EXOTEL_OUTBOUND_FROM ||
    process.env.TWILIO_OUTBOUND_FROM ||
    ''

  if (!fromNumber) {
    await db
      .from('appointment_reminders')
      .update({
        status: 'failed',
        error_message: 'no_caller_id_configured',
      })
      .eq('id', reminderId)
    return { reminderId, ok: false, reason: 'no_caller_id_configured' }
  }

  // 6. Dial via provider.
  try {
    const result = await provider.placeOutboundCall({
      to: reminder.to_number,
      from: fromNumber,
      twimlUrl: `${appUrl()}/api/voice/reminder-twiml/${reminderId}`,
      statusCallbackUrl: `${appUrl()}/api/webhooks/twilio/status`,
      timeoutSec: 30,
      machineDetection: true,
    })

    await db
      .from('appointment_reminders')
      .update({
        status: 'in_progress',
        provider_call_sid: result.callSid,
        provider: provider.name,
        from_number: fromNumber,
        placed_at: new Date().toISOString(),
      })
      .eq('id', reminderId)

    // 7. Quota tick.
    await recordCallUsage(reminder.clinic_id, 1)

    return { reminderId, ok: true, callSid: result.callSid }
  } catch (err: any) {
    const message = err?.message ?? String(err)
    await db
      .from('appointment_reminders')
      .update({
        status: 'failed',
        error_message: `dial_error: ${message.slice(0, 200)}`,
      })
      .eq('id', reminderId)
    return { reminderId, ok: false, reason: `dial_error: ${message}` }
  }
}

/** "14:30:00" → "2:30 PM" for nicer TTS pronunciation. */
function formatTimeForSpeech(raw?: string): string {
  if (!raw) return ''
  const [hStr, mStr] = raw.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10) || 0
  if (Number.isNaN(h)) return raw
  const hour12 = ((h + 11) % 12) + 1
  const meridiem = h < 12 ? 'AM' : 'PM'
  return m === 0 ? `${hour12} ${meridiem}` : `${hour12}:${m.toString().padStart(2, '0')} ${meridiem}`
}
