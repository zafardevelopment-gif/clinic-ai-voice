import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/** GET /api/clinic/copilot/[id]   full detail (session + qa + suggestions) for one co-pilot session */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data: triageSession, error } = await db
    .from('symptom_triage_sessions')
    .select('*, patients ( full_name, phone )')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .eq('mode', 'doctor_copilot')
    .single()

  if (error || !triageSession) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const [{ data: answers }, { data: result }] = await Promise.all([
    db.from('triage_answers').select('*').eq('session_id', params.id).maybeSingle(),
    db.from('triage_results').select('*').eq('session_id', params.id).maybeSingle(),
  ])

  return NextResponse.json({ session: triageSession, answers, result })
}
