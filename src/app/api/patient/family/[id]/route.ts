import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/** DELETE /api/patient/family/:id — the inviting patient removes a family contact. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const { error } = await db
    .from('family_contacts')
    .delete()
    .eq('id', id)
    .eq('patient_id', session.patientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
