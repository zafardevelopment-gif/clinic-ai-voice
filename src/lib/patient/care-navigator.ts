/* eslint-disable @typescript-eslint/no-explicit-any */
import { detectRedFlags } from '@/lib/ai/guardrails'
import type { CareNavigatorSource, CareNavigatorSeverity } from '@/types/database'

/**
 * Care Navigator: flags concerning signals across a patient's symptom text,
 * lab markers, and missed-dose history, and suggests a next step. Per the
 * architecture plan, referral suggestions are generic ("consult a doctor" +
 * nearby search) — no clinic-partner matching in this phase.
 *
 * Detection is deliberately deterministic-first, reusing the SAME red-flag
 * keyword engine as clinic triage (src/lib/ai/guardrails.ts's
 * detectRedFlags) rather than a second parallel classifier — one place
 * defines what counts as an emergency signal, used by both the clinic
 * triage flow and the patient app.
 */

const MISSED_DOSE_ESCALATION_THRESHOLD = 3 // consecutive missed doses for the SAME medicine

export interface SymptomCheckInput {
  patientId: string
  text: string
  feverC?: number | null
  ageGroup?: string | null
}

export interface CareNavigatorResult {
  triggered: boolean
  severity: CareNavigatorSeverity | null
  summary: string
  suggestedAction: string
  redFlags: string[]
}

const NEARBY_CARE_SUGGESTION = 'Consult a doctor. If you don\'t have one nearby, search "doctor near me" or "hospital near me" on Google Maps.'

/** Ad-hoc symptom check — patient types free text describing how they feel; no stored session, unlike clinic triage. */
export function checkSymptomText(input: SymptomCheckInput): CareNavigatorResult {
  const redFlags = detectRedFlags({ text: input.text, feverC: input.feverC, ageGroup: input.ageGroup })

  if (redFlags.length > 0) {
    return {
      triggered: true,
      severity: 'emergency',
      summary: 'What you described may be a medical emergency.',
      suggestedAction: 'Seek immediate in-person or emergency care now — do not wait. Call emergency services or go to the nearest hospital.',
      redFlags,
    }
  }

  return { triggered: false, severity: null, summary: '', suggestedAction: '', redFlags: [] }
}

/**
 * Checks a patient's recent dose history for a pattern serious enough to
 * flag — 3+ consecutive missed doses of the same active medicine. Runs
 * after PATCH /api/patient/doses/:id whenever a dose is marked 'missed'.
 */
export async function checkMissedDosePattern(
  db: any,
  patientId: string,
  patientMedicineId: string,
): Promise<CareNavigatorResult> {
  const { data: recent } = await db
    .from('patient_medicine_doses')
    .select('status')
    .eq('patient_medicine_id', patientMedicineId)
    .neq('status', 'pending')
    .order('scheduled_at', { ascending: false })
    .limit(MISSED_DOSE_ESCALATION_THRESHOLD)

  const recentStatuses = ((recent || []) as Array<{ status: string }>).map(r => r.status)
  const allMissed = recentStatuses.length === MISSED_DOSE_ESCALATION_THRESHOLD && recentStatuses.every(s => s === 'missed')

  if (!allMissed) return { triggered: false, severity: null, summary: '', suggestedAction: '', redFlags: [] }

  const { data: medicine } = await db.from('patient_medicines').select('medicine_name').eq('id', patientMedicineId).maybeSingle()
  const medicineName = medicine?.medicine_name || 'a medicine'

  return {
    triggered: true,
    severity: 'urgent',
    summary: `${MISSED_DOSE_ESCALATION_THRESHOLD} doses of ${medicineName} in a row have been missed.`,
    suggestedAction: `Missing ${medicineName} repeatedly can affect your treatment. Consider talking to a doctor about your schedule, or set reminders that fit your routine better.`,
    redFlags: [],
  }
}

/** Persists a care_navigator_flags row. Dedupes against an existing OPEN flag from the same source to avoid spamming the home screen. */
export async function raiseCareNavigatorFlag(
  db: any,
  input: {
    patientId: string
    source: CareNavigatorSource
    severity: CareNavigatorSeverity
    summary: string
    suggestedAction: string
    redFlags?: string[]
    relatedLabReportId?: string | null
  },
): Promise<void> {
  const { data: existing } = await db
    .from('care_navigator_flags')
    .select('id')
    .eq('patient_id', input.patientId)
    .eq('source', input.source)
    .eq('status', 'open')
    .maybeSingle()

  if (existing) return

  await db.from('care_navigator_flags').insert({
    patient_id: input.patientId,
    source: input.source,
    severity: input.severity,
    summary: input.summary,
    suggested_action: input.suggestedAction || NEARBY_CARE_SUGGESTION,
    red_flags: input.redFlags || [],
    related_lab_report_id: input.relatedLabReportId || null,
  })
}
