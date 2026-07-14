import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/**
 * POST /api/patient/link-clinic  { clinicId }
 *
 * Sets the calling patient's clinic_id — the "share with a clinic" action
 * for an independent patient. patients.clinic_id is a single field (see
 * migration 0009), so linking is whole-patient, not per-consultation:
 * once linked, the patient's existing/future consultations become visible
 * to that clinic's staff the same way any clinic-scoped patient's would.
 *
 * DELETE unlinks (sets clinic_id back to null) — a patient can leave a
 * clinic link at any time.
 */
export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { clinicId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.clinicId) return NextResponse.json({ error: 'clinicId is required' }, { status: 400 })

  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('id, name')
    .eq('id', body.clinicId)
    .eq('is_active', true)
    .maybeSingle()

  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const { data, error } = await db
    .from('patients')
    .update({ clinic_id: clinic.id })
    .eq('id', session.patientId)
    .select('id, clinic_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ clinicId: data.clinic_id, clinicName: clinic.name })
}

/** DELETE /api/patient/link-clinic — unlink from the currently linked clinic. */
export async function DELETE(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { error } = await db
    .from('patients')
    .update({ clinic_id: null })
    .eq('id', session.patientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
