import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'
import type { DoseStatus } from '@/types/database'

const VALID_STATUSES: DoseStatus[] = ['taken', 'missed', 'skipped']

/**
 * PATCH /api/patient/doses/:id — mark a dose taken/missed/skipped.
 *
 * Phase 1 only records the response. Family-alert escalation on repeated
 * missed doses (mirroring adherence_alerts' `repeated_missed` rule for
 * clinic follow_up_plans) is Phase 2 — see plan doc.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  let body: { status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const status = body.status as DoseStatus
  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, { status: 400 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('patient_medicine_doses')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', id)
    .eq('patient_id', session.patientId)
    .select()
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
