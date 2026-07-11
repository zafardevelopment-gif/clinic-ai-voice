import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import type { Database, TriageCategory } from '@/types/database'

type TriageResultUpdate = Database['public']['Tables']['triage_results']['Update']
const VALID_CATEGORIES: TriageCategory[] = ['emergency', 'urgent_same_day', 'routine', 'follow_up']

/**
 * GET   /api/clinic/triage/[id]   full detail (answers + result) for one session
 * PATCH /api/clinic/triage/[id]   staff edits the AI summary before doctor review
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data: triageSession, error } = await db
    .from('symptom_triage_sessions')
    .select('*, patients ( full_name, phone )')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .single()

  if (error || !triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: answers }, { data: result }] = await Promise.all([
    db.from('triage_answers').select('*').eq('session_id', params.id).maybeSingle(),
    db.from('triage_results').select('*, doctors:suggested_doctor_id ( full_name )').eq('session_id', params.id).maybeSingle(),
  ])

  return NextResponse.json({ session: triageSession, answers, result })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['clinic_admin', 'doctor'])) {
    return NextResponse.json({ error: 'Forbidden — only doctors/clinic admins can edit triage results' }, { status: 403 })
  }

  let body: { summary?: string; doctor_notes?: string; category?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const db = getDb()

  // Confirm the session belongs to this clinic before touching its result.
  const { data: triageSession } = await db
    .from('symptom_triage_sessions')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .maybeSingle()
  if (!triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const patch: TriageResultUpdate = { is_ai_edited: true, reviewed_by: session.userId, reviewed_at: new Date().toISOString() }
  if (body.summary) patch.summary = body.summary
  if (body.doctor_notes) patch.doctor_notes = body.doctor_notes
  if (body.category && VALID_CATEGORIES.includes(body.category as TriageCategory)) {
    patch.category = body.category as TriageCategory
  }

  const { data, error } = await db
    .from('triage_results')
    .update(patch)
    .eq('session_id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from('symptom_triage_sessions').update({ status: 'reviewed' }).eq('id', params.id)

  return NextResponse.json(data)
}
