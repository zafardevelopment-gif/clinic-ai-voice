import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/**
 * GET /api/patient/doses?window=today|upcoming|all
 *
 * "today": doses scheduled for the current IST day (the home-screen
 * checklist). "upcoming": next 7 days, pending only. "all": full history,
 * most recent first — capped at 200.
 */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const window = req.nextUrl.searchParams.get('window') || 'today'
  const db = getDb()

  let q = db
    .from('patient_medicine_doses')
    .select('*, patient_medicines ( medicine_name, dosage )')
    .eq('patient_id', session.patientId)

  if (window === 'today') {
    const nowIst = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    const istDateStr = nowIst.toISOString().slice(0, 10)
    const dayStart = new Date(new Date(`${istDateStr}T00:00:00`).getTime() - 5.5 * 60 * 60 * 1000).toISOString()
    const dayEnd = new Date(new Date(`${istDateStr}T23:59:59`).getTime() - 5.5 * 60 * 60 * 1000).toISOString()
    q = q.gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd).order('scheduled_at')
  } else if (window === 'upcoming') {
    q = q.eq('status', 'pending').gte('scheduled_at', new Date().toISOString()).order('scheduled_at').limit(100)
  } else {
    q = q.order('scheduled_at', { ascending: false }).limit(200)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
