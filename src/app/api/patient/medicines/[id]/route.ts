import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/** DELETE /api/patient/medicines/:id — stop a medicine (is_active = false); pending future doses are cancelled. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const { data: medicine, error } = await db
    .from('patient_medicines')
    .update({ is_active: false })
    .eq('id', id)
    .eq('patient_id', session.patientId)
    .select('id')
    .single()

  if (error || !medicine) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })

  await db
    .from('patient_medicine_doses')
    .update({ status: 'skipped' })
    .eq('patient_medicine_id', id)
    .eq('status', 'pending')

  return NextResponse.json({ ok: true })
}
