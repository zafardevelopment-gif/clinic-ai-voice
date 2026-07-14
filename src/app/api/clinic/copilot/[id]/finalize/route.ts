import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import type {
  CopilotSuggestedDiagnosis,
  CopilotSuggestedTest,
  CopilotSuggestedMedication,
  CopilotFinalPrescriptionItem,
  SuggestionStatus,
} from '@/types/database'

/**
 * POST /api/clinic/copilot/[id]/finalize
 * {
 *   password: string,                         // re-entered login password — acts as the e-signature
 *   diagnosisDecisions: { index: number, status: 'accepted'|'edited'|'rejected', editedCondition?: string }[],
 *   testDecisions: { index: number, status: 'accepted'|'edited'|'rejected', editedTestName?: string }[],
 *   medicationDecisions: { index: number, status: 'accepted'|'edited'|'rejected', editedDosage?: string }[],
 *   finalDiagnosis: string,
 *   finalPrescription: { drug, dosage, frequency, durationDays, formularyId }[],
 * }
 *
 * Every AI suggestion is stamped with the doctor's decision (never silently
 * dropped) and only doctor-confirmed items feed doctor_final_diagnosis /
 * doctor_final_prescription — nothing here is auto-applied. Password
 * re-verification is the e-signature: finalize is unreachable without it.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['doctor'])) {
    return NextResponse.json({ error: 'Forbidden — only the treating doctor can finalize' }, { status: 403 })
  }

  let body: {
    password?: string
    diagnosisDecisions?: Array<{ index: number; status: SuggestionStatus; editedCondition?: string }>
    testDecisions?: Array<{ index: number; status: SuggestionStatus; editedTestName?: string }>
    medicationDecisions?: Array<{ index: number; status: SuggestionStatus; editedDosage?: string }>
    finalDiagnosis?: string
    finalPrescription?: Array<{ drug: string; dosage: string; frequency: string; durationDays?: number | null; formularyId?: string | null }>
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.password) return NextResponse.json({ error: 'password is required to finalize' }, { status: 400 })
  if (!body.finalDiagnosis?.trim()) return NextResponse.json({ error: 'finalDiagnosis is required' }, { status: 400 })

  const db = getDb()

  // Re-verify the doctor's own login password — this is the e-signature.
  const { data: user } = await db
    .from('users')
    .select('id, password_hash')
    .eq('id', session.userId)
    .single()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const passwordValid = await bcrypt.compare(body.password, user.password_hash)
  if (!passwordValid) return NextResponse.json({ error: 'Incorrect password — could not verify signature' }, { status: 401 })

  const { data: triageSession } = await db
    .from('symptom_triage_sessions')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .eq('mode', 'doctor_copilot')
    .maybeSingle()
  if (!triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: result } = await db
    .from('triage_results')
    .select('ai_suggested_diagnoses, ai_suggested_tests, ai_suggested_medications')
    .eq('session_id', params.id)
    .maybeSingle()
  if (!result) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const diagnoses: CopilotSuggestedDiagnosis[] = result.ai_suggested_diagnoses.map((d, i) => {
    const decision = body.diagnosisDecisions?.find(x => x.index === i)
    if (!decision) return d
    return {
      ...d,
      condition: decision.status === 'edited' && decision.editedCondition ? decision.editedCondition : d.condition,
      status: decision.status,
    }
  })
  const tests: CopilotSuggestedTest[] = result.ai_suggested_tests.map((t, i) => {
    const decision = body.testDecisions?.find(x => x.index === i)
    if (!decision) return t
    return {
      ...t,
      test_name: decision.status === 'edited' && decision.editedTestName ? decision.editedTestName : t.test_name,
      status: decision.status,
    }
  })
  const medications: CopilotSuggestedMedication[] = result.ai_suggested_medications.map((m, i) => {
    const decision = body.medicationDecisions?.find(x => x.index === i)
    if (!decision) return m
    return {
      ...m,
      dosage_range: decision.status === 'edited' && decision.editedDosage ? decision.editedDosage : m.dosage_range,
      status: decision.status,
    }
  })

  const acceptedCount = [...diagnoses, ...tests, ...medications].filter(
    x => x.status === 'accepted' || x.status === 'edited',
  ).length
  const totalCount = diagnoses.length + tests.length + medications.length

  const finalPrescription: CopilotFinalPrescriptionItem[] = (body.finalPrescription || []).map(p => ({
    drug: p.drug,
    dosage: p.dosage,
    frequency: p.frequency,
    duration_days: p.durationDays ?? null,
    formulary_id: p.formularyId ?? null,
  }))

  const { data: updated, error } = await db
    .from('triage_results')
    .update({
      ai_suggested_diagnoses: diagnoses,
      ai_suggested_tests: tests,
      ai_suggested_medications: medications,
      doctor_final_diagnosis: body.finalDiagnosis.trim(),
      doctor_final_prescription: finalPrescription,
      ai_suggestions_accepted_count: acceptedCount,
      ai_suggestions_total_count: totalCount,
      finalized_at: new Date().toISOString(),
      finalized_by: session.userId,
      is_ai_edited: true,
      reviewed_by: session.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('session_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('symptom_triage_sessions').update({ status: 'reviewed' }).eq('id', params.id)

  return NextResponse.json(updated)
}
