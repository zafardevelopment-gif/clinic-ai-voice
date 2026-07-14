import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import { generateCopilotSuggestions } from '@/lib/ai/copilot'
import type { CopilotSuggestedDiagnosis, CopilotSuggestedTest, CopilotSuggestedMedication } from '@/types/database'

/**
 * POST /api/clinic/copilot/[id]/complete
 * Doctor marks the consultation "complete" — generates the differential/
 * test/medication suggestion panel from the accumulated complaint + Q&A.
 * Nothing here is final; every item starts 'pending' and requires the
 * doctor's explicit Accept/Edit/Reject (see the finalize route) before it
 * can become part of the record.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['doctor'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = getDb()

  const { data: triageSession } = await db
    .from('symptom_triage_sessions')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .eq('mode', 'doctor_copilot')
    .maybeSingle()
  if (!triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: answers } = await db
    .from('triage_answers')
    .select('chief_complaint, qa_log')
    .eq('session_id', params.id)
    .maybeSingle()
  if (!answers) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: formularyRows } = await db
    .from('formulary_medications')
    .select('id, drug_name, drug_class, dosage_range, source_reference')
    .eq('is_active', true)

  const suggestions = await generateCopilotSuggestions({
    presentingComplaint: answers.chief_complaint,
    qaSoFar: answers.qa_log.map(qa => ({ question: qa.question, answer: qa.answer })),
    formulary: (formularyRows || []).map(f => ({
      id: f.id,
      drugName: f.drug_name,
      drugClass: f.drug_class,
      dosageRange: f.dosage_range,
      sourceReference: f.source_reference,
    })),
  })

  const diagnoses: CopilotSuggestedDiagnosis[] = suggestions.diagnoses.map(d => ({
    condition: d.condition,
    confidence_note: d.confidenceNote,
    status: 'pending',
  }))
  const tests: CopilotSuggestedTest[] = suggestions.tests.map(t => ({
    test_name: t.testName,
    reason: t.reason,
    status: 'pending',
  }))
  const medications: CopilotSuggestedMedication[] = suggestions.medications.map(m => ({
    formulary_id: m.formularyId,
    drug: m.drug,
    dosage_range: m.dosageRange,
    source_reference: m.sourceReference,
    note: m.note,
    status: 'pending',
  }))

  const totalCount = diagnoses.length + tests.length + medications.length

  const { data: result, error } = await db
    .from('triage_results')
    .update({
      ai_suggested_diagnoses: diagnoses,
      ai_suggested_tests: tests,
      ai_suggested_medications: medications,
      ai_model: suggestions.aiModel,
      ai_suggestions_total_count: totalCount,
      ai_suggestions_accepted_count: 0,
    })
    .eq('session_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}
