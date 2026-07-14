import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'

/**
 * GET  /api/clinic/copilot   list doctor co-pilot sessions for this clinic
 * POST /api/clinic/copilot   start a new co-pilot session (presenting complaint only)
 */
export async function GET() {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('symptom_triage_sessions')
    .select(`
      id, status, patient_id, created_at,
      patients ( full_name, phone ),
      triage_results ( id, finalized_at, doctor_final_diagnosis )
    `)
    .eq('clinic_id', session.clinicId)
    .eq('mode', 'doctor_copilot')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['doctor'])) {
    return NextResponse.json({ error: 'Forbidden — only doctors can start a co-pilot session' }, { status: 403 })
  }

  let body: { patient_id?: string | null; presenting_complaint: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.presenting_complaint?.trim()) {
    return NextResponse.json({ error: 'presenting_complaint is required' }, { status: 400 })
  }

  const db = getDb()

  const { data: triageSession, error: sessionError } = await db
    .from('symptom_triage_sessions')
    .insert({
      clinic_id: session.clinicId,
      patient_id: body.patient_id || null,
      source: 'doctor_copilot',
      mode: 'doctor_copilot',
      created_by: session.userId,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (sessionError || !triageSession) {
    return NextResponse.json({ error: sessionError?.message || 'Failed to start session' }, { status: 500 })
  }

  await db.from('triage_answers').insert({
    session_id: triageSession.id,
    chief_complaint: body.presenting_complaint.trim(),
    qa_log: [],
  })

  const { data: triageResult, error: resultError } = await db
    .from('triage_results')
    .insert({
      session_id: triageSession.id,
      category: 'routine',
      summary: '',
    })
    .select('id')
    .single()

  if (resultError) return NextResponse.json({ error: resultError.message }, { status: 500 })

  return NextResponse.json({ sessionId: triageSession.id, resultId: triageResult.id }, { status: 201 })
}
