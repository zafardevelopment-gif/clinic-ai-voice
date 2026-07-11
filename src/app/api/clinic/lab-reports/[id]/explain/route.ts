import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { explainLabReport } from '@/lib/ai/lab-explanation'

/**
 * POST /api/clinic/lab-reports/[id]/explain
 *
 * Idempotent by design in the sense that re-running never overwrites — each
 * call appends a new lab_explanations row (append-only history per spec).
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data: report } = await db
    .from('lab_reports')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: markers } = await db
    .from('lab_report_markers')
    .select('marker_name, value, unit, reference_range, flag')
    .eq('lab_report_id', params.id)
    .order('sort_order')

  if (!markers || markers.length === 0) {
    return NextResponse.json({ error: 'No markers entered for this report yet' }, { status: 400 })
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
      lab_report_id: params.id,
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

  await db.from('lab_reports').update({ status: 'explained' }).eq('id', params.id)

  return NextResponse.json(explanation, { status: 201 })
}
