/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendExpoPush } from '@/lib/notify/expo-push'

/**
 * Sends a push notification for each `patient_medicine_doses` row whose
 * scheduled_at has passed and is still 'pending'. Does NOT change dose
 * status — the patient marking taken/missed/skipped is what advances state
 * (PATCH /api/patient/doses/:id); this only nudges them.
 *
 * Called from the same /api/cron/reminders heartbeat that dispatches clinic
 * appointment reminders, kept as a separate function since the two schedules
 * (appointment_reminders vs patient_medicine_doses) are unrelated tables.
 */
export async function dispatchDueDoseReminders(db: any): Promise<{ sent: number; skipped_no_token: number; failed: number }> {
  const now = new Date().toISOString()
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // Only notify for doses due in the last 5 minutes — avoids re-notifying a
  // dose that's been pending for days if the cron was down, and avoids
  // notifying doses scheduled far in the future.
  const { data: due } = await db
    .from('patient_medicine_doses')
    .select('id, scheduled_at, patient_id, patients ( expo_push_token ), patient_medicines ( medicine_name, dosage )')
    .eq('status', 'pending')
    .gte('scheduled_at', fiveMinAgo)
    .lte('scheduled_at', now)
    .limit(200)

  if (!due || due.length === 0) return { sent: 0, skipped_no_token: 0, failed: 0 }

  let sent = 0
  let skippedNoToken = 0
  let failed = 0

  for (const dose of due as any[]) {
    const token = dose.patients?.expo_push_token
    if (!token) { skippedNoToken++; continue }

    const medicineName = dose.patient_medicines?.medicine_name || 'your medicine'
    const dosage = dose.patient_medicines?.dosage
    const result = await sendExpoPush({
      to: token,
      title: 'Medicine reminder',
      body: dosage ? `Time to take ${medicineName} (${dosage})` : `Time to take ${medicineName}`,
      data: { type: 'dose_reminder', doseId: dose.id },
    })

    if (result.ok) sent++
    else failed++
  }

  return { sent, skipped_no_token: skippedNoToken, failed }
}
