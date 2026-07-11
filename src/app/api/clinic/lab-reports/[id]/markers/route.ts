import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { deriveFlag } from '@/lib/ai/lab-explanation'

interface MarkerInput {
  marker_name: string
  value: string
  unit?: string | null
  reference_range?: string | null
}

/**
 * POST /api/clinic/lab-reports/[id]/markers
 * Body: { markers: MarkerInput[] } — replaces all existing markers for this
 * report (simplest correct model for manual entry: staff submits the full set).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { markers: MarkerInput[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!Array.isArray(body.markers) || body.markers.length === 0) {
    return NextResponse.json({ error: 'markers array required' }, { status: 400 })
  }

  const db = getDb()
  const { data: report } = await db
    .from('lab_reports')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .maybeSingle()
  if (!report) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  await db.from('lab_report_markers').delete().eq('lab_report_id', params.id)

  const rows = body.markers.map((m, i) => {
    const flag = deriveFlag(m.value, m.reference_range || undefined)
    return {
      lab_report_id: params.id,
      marker_name: m.marker_name,
      value: m.value,
      unit: m.unit || null,
      reference_range: m.reference_range || null,
      is_abnormal: flag !== 'normal',
      flag,
      sort_order: i,
    }
  })

  const { data, error } = await db.from('lab_report_markers').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('lab_reports').update({ status: 'entered' }).eq('id', params.id)

  return NextResponse.json(data, { status: 201 })
}
