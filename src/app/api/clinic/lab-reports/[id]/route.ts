import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/** GET /api/clinic/lab-reports/[id] — report + markers + explanation history. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data: report, error } = await db
    .from('lab_reports')
    .select('*, patients ( full_name, phone )')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .single()

  if (error || !report) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: markers }, { data: explanations }] = await Promise.all([
    db.from('lab_report_markers').select('*').eq('lab_report_id', params.id).order('sort_order'),
    db.from('lab_explanations').select('*').eq('lab_report_id', params.id).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    report,
    markers: markers || [],
    explanations: explanations || [],
    latestExplanation: explanations?.[0] || null,
  })
}
