import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'
import type { DoseStatus } from '@/types/database'
import { checkMissedDosePattern, raiseCareNavigatorFlag } from '@/lib/patient/care-navigator'
import { notifyFamilyOfMissedDoses } from '@/lib/patient/family-alerts'

const VALID_STATUSES: DoseStatus[] = ['taken', 'missed', 'skipped']

/**
 * PATCH /api/patient/doses/:id — mark a dose taken/missed/skipped.
 *
 * On 'missed', checks for a repeated-missed pattern (3+ consecutive misses
 * of the same medicine) and, if found, raises a Care Navigator flag for the
 * patient AND notifies opted-in family contacts — mirroring how
 * adherence_alerts' `repeated_missed` rule works for clinic follow_up_plans,
 * but for the patient app's own medicine tracking.
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

  if (status === 'missed') {
    const pattern = await checkMissedDosePattern(db, session.patientId, data.patient_medicine_id)
    if (pattern.triggered && pattern.severity) {
      await raiseCareNavigatorFlag(db, {
        patientId: session.patientId,
        source: 'missed_doses',
        severity: pattern.severity,
        summary: pattern.summary,
        suggestedAction: pattern.suggestedAction,
      })

      const { data: medicine } = await db.from('patient_medicines').select('medicine_name').eq('id', data.patient_medicine_id).maybeSingle()
      await notifyFamilyOfMissedDoses(db, session.patientId, data.patient_medicine_id, medicine?.medicine_name || 'their medicine')
    }
  }

  return NextResponse.json(data)
}
