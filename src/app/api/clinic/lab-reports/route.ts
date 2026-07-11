import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET  /api/clinic/lab-reports    list reports for the clinic
 * POST /api/clinic/lab-reports    create a report shell (markers added separately)
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('lab_reports')
    .select('id, patient_id, report_date, lab_name, status, created_at, patients ( full_name, phone )')
    .eq('clinic_id', session.clinicId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { patient_id: string; appointment_id?: string | null; report_date?: string | null; lab_name?: string | null; uploaded_file_url?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.patient_id) return NextResponse.json({ error: 'patient_id required' }, { status: 400 })

  const db = getDb()
  const { data, error } = await db
    .from('lab_reports')
    .insert({
      clinic_id: session.clinicId,
      patient_id: body.patient_id,
      appointment_id: body.appointment_id || null,
      report_date: body.report_date || null,
      lab_name: body.lab_name || null,
      uploaded_file_url: body.uploaded_file_url || null,
      entered_by: session.userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
