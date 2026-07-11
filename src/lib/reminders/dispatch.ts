/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getNotificationProvider } from '@/lib/notify'
import { getPatientMessageTemplate, renderTemplate, type MessageLanguage } from '@/lib/notify/templates'
import { placeReminderCall } from './place-call'

/**
 * Multi-channel dispatch for a single queued appointment_reminders row.
 *
 * voice   → delegates to placeReminderCall() (owns the full TwiML/script flow).
 * whatsapp/sms → renders the text template and sends via NotificationProvider,
 *                logging a reminder_events row for the communication timeline.
 *
 * Idempotency: caller (cron dispatchDue) only selects status='scheduled' rows
 * and this function immediately no-ops if the row isn't 'scheduled' anymore —
 * two overlapping cron ticks can't double-send the same row.
 */

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any
}

export interface DispatchResult {
  reminderId: string
  ok: boolean
  reason?: string
}

export async function dispatchReminder(reminderId: string): Promise<DispatchResult> {
  const db = admin()

  const { data: reminder } = await db
    .from('appointment_reminders')
    .select(`
      id, clinic_id, type, status, channel, to_number, metadata,
      clinics ( name ),
      patients ( full_name ),
      appointments ( appointment_date, appointment_time, doctors ( full_name ) )
    `)
    .eq('id', reminderId)
    .single()

  if (!reminder) return { reminderId, ok: false, reason: 'not_found' }
  if (reminder.status !== 'scheduled') return { reminderId, ok: false, reason: `not_scheduled (${reminder.status})` }

  if (reminder.channel === 'voice') {
    const result = await placeReminderCall(reminderId)
    await logEvent(db, reminderId, result.ok ? 'sent' : 'failed', { reason: result.reason })
    return { reminderId, ok: result.ok, reason: result.reason }
  }

  // whatsapp / sms
  const { data: settings } = await db
    .from('reminder_settings')
    .select('language')
    .eq('clinic_id', reminder.clinic_id)
    .maybeSingle()

  const clinic = reminder.clinics as any
  const patient = reminder.patients as any
  const appt = reminder.appointments as any
  const doctor = appt?.doctors as any
  const language: MessageLanguage = settings?.language === 'en-IN' ? 'en-IN' : 'hi-IN'

  const template = getPatientMessageTemplate(reminder.type as any, language)
  if (!template) {
    await db.from('appointment_reminders').update({ status: 'cancelled', error_message: 'no_template_for_type' }).eq('id', reminderId)
    return { reminderId, ok: false, reason: 'no_template_for_type' }
  }

  const body = renderTemplate(template, {
    patient_name: patient?.full_name ?? 'Sir/Madam',
    doctor_name: doctor?.full_name ?? '',
    date: appt?.appointment_date ?? '',
    time: appt?.appointment_time?.slice(0, 5) ?? '',
    clinic_name: clinic?.name ?? 'the clinic',
  })

  try {
    const provider = getNotificationProvider(reminder.channel)
    const result = await provider.send({ to: reminder.to_number, body, metadata: { reminderId } })

    // appointment_reminders.status stays on the existing reminder_status enum
    // (scheduled/in_progress/answered/no_answer/busy/failed/cancelled) so it
    // works uniformly across channels. 'answered' means "delivered to the
    // patient" for text channels. The precise WhatsApp/SMS-only states
    // (sent/delivered/opened/responded) live in reminder_events instead.
    await db
      .from('appointment_reminders')
      .update({
        status: result.status === 'failed' ? 'failed' : 'answered',
        placed_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        provider: provider.name,
        spoken_script: body,
        error_message: result.errorMessage ?? null,
      })
      .eq('id', reminderId)

    await logEvent(db, reminderId, result.status === 'failed' ? 'failed' : 'sent', { providerMessageId: result.providerMessageId })
    if (result.status === 'delivered') {
      await logEvent(db, reminderId, 'delivered', { providerMessageId: result.providerMessageId })
    }

    return { reminderId, ok: result.status !== 'failed' }
  } catch (err: any) {
    const message = err?.message ?? String(err)
    await db.from('appointment_reminders').update({ status: 'failed', error_message: message.slice(0, 200) }).eq('id', reminderId)
    await logEvent(db, reminderId, 'failed', { error: message })
    return { reminderId, ok: false, reason: message }
  }
}

async function logEvent(db: any, reminderId: string, eventType: string, payload: Record<string, unknown>) {
  await db.from('reminder_events').insert({ reminder_id: reminderId, event_type: eventType, payload })
}
