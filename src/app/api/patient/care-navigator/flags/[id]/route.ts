import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/** PATCH /api/patient/care-navigator/flags/:id — patient dismisses/resolves a flag after seeing it. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { status?: 'acknowledged' | 'resolved' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (body.status !== 'acknowledged' && body.status !== 'resolved') {
    return NextResponse.json({ error: 'status must be "acknowledged" or "resolved"' }, { status: 400 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('care_navigator_flags')
    .update({
      status: body.status,
      ...(body.status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
    })
    .eq('id', id)
    .eq('patient_id', session.patientId)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
