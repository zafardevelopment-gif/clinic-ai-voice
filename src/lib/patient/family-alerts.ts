/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendExpoPush } from '@/lib/notify/expo-push'

/**
 * Notifies every family_contact who opted into `alert_on_missed_dose` when
 * a patient hits the repeated-missed-dose threshold (see
 * care-navigator.ts's checkMissedDosePattern). Family members are
 * themselves lightweight patient accounts (per the architecture plan — no
 * third-party SMS/WhatsApp provider needed), so this reuses the same Expo
 * push path as dose reminders, targeting the family member's own token.
 *
 * Dedupes via family_alerts: at most one alert per (family_contact,
 * patient_medicine) pair per 24h, so a patient missing the same medicine
 * repeatedly doesn't spam their family member on every single miss.
 */
export async function notifyFamilyOfMissedDoses(
  db: any,
  patientId: string,
  patientMedicineId: string,
  medicineName: string,
): Promise<{ notified: number }> {
  const { data: contacts } = await db
    .from('family_contacts')
    .select('id, family_patient_id, patients:family_patient_id ( expo_push_token )')
    .eq('patient_id', patientId)
    .eq('alert_on_missed_dose', true)
    .not('accepted_at', 'is', null)

  if (!contacts || contacts.length === 0) return { notified: 0 }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let notified = 0

  for (const contact of contacts as any[]) {
    const { data: recentAlert } = await db
      .from('family_alerts')
      .select('id')
      .eq('family_contact_id', contact.id)
      .eq('patient_medicine_id', patientMedicineId)
      .gte('sent_at', oneDayAgo)
      .maybeSingle()
    if (recentAlert) continue

    const token = contact.patients?.expo_push_token
    let pushOk = false
    if (token) {
      const result = await sendExpoPush({
        to: token,
        title: 'Missed medicine alert',
        body: `Your family member has missed several doses of ${medicineName}.`,
        data: { type: 'family_missed_dose_alert', patientId, patientMedicineId },
      })
      pushOk = result.ok
    }

    await db.from('family_alerts').insert({
      family_contact_id: contact.id,
      patient_id: patientId,
      patient_medicine_id: patientMedicineId,
      push_ok: pushOk,
    })
    if (pushOk) notified++
  }

  return { notified }
}
