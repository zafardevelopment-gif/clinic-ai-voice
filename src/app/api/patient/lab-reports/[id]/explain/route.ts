import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'
import { explainLabReport } from '@/lib/ai/lab-explanation'
import { raiseCareNavigatorFlag } from '@/lib/patient/care-navigator'

/**
 * POST /api/patient/lab-reports/:id/explain
 *
 * Same explainLabReport() call as the clinic route, scoped to the
 * requesting patient's own report. Also feeds the result into Care
 * Navigator: an 'urgent_review' outcome raises a flag the patient sees on
 * their home screen with a suggested next step.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const { data: report } = await db
    .from('lab_reports')
    .select('id')
    .eq('id', id)
    .eq('patient_id', session.patientId)
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: markers } = await db
    .from('lab_report_markers')
    .select('marker_name, value, unit, reference_range, flag')
    .eq('lab_report_id', id)
    .order('sort_order')

  if (!markers || markers.length === 0) {
    return NextResponse.json({ error: 'No test results found for this report yet' }, { status: 400 })
  }

  const result = await explainLabReport(
    markers.map(m => ({
      name: m.marker_name,
      value: m.value,
      unit: m.unit || undefined,
      referenceRange: m.reference_range || undefined,
      flag: m.flag,
    })),
  )

  const { data: explanation, error } = await db
    .from('lab_explanations')
    .insert({
      lab_report_id: id,
      patient_summary_en: result.patientSummaryEn,
      patient_summary_hi: result.patientSummaryHi,
      abnormal_markers_summary: result.abnormalMarkersSummary,
      doctor_discussion_points: result.doctorDiscussionPoints,
      next_action_category: result.nextActionCategory,
      ai_model: result.aiModel,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('lab_reports').update({ status: 'explained' }).eq('id', id)

  if (result.nextActionCategory === 'urgent_review') {
    const abnormal = markers.filter(m => m.flag !== 'normal').map(m => m.marker_name)
    await raiseCareNavigatorFlag(db, {
      patientId: session.patientId,
      source: 'lab_marker',
      severity: 'urgent',
      summary: `Lab report shows values needing prompt review: ${abnormal.join(', ') || 'see report'}.`,
      suggestedAction: 'Consult a doctor about this report soon — do not wait for your next scheduled visit.',
      relatedLabReportId: id,
    })
  }

  return NextResponse.json(explanation, { status: 201 })
}
