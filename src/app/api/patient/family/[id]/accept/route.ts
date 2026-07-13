import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/** POST /api/patient/family/:id/accept — the invited family member accepts, enabling alerts to flow to them. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const { data, error } = await db
    .from('family_contacts')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('family_patient_id', session.patientId) // only the invited party can accept their own invite
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
