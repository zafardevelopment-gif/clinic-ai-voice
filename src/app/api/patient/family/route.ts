import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/**
 * GET  /api/patient/family   list contacts I've invited to watch me, AND
 *                            patients who've invited me to watch them
 * POST /api/patient/family   invite a family member by email — they must
 *   already have their own patient-app account (per architecture plan:
 *   family members are lightweight patient accounts themselves, so alerts
 *   ride the same push infra with no third-party SMS/WhatsApp dependency).
 */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const [watchingMe, iAmWatching] = await Promise.all([
    db
      .from('family_contacts')
      .select('id, relationship, alert_on_missed_dose, invited_at, accepted_at, patients:family_patient_id ( id, full_name, email )')
      .eq('patient_id', session.patientId),
    db
      .from('family_contacts')
      .select('id, relationship, alert_on_missed_dose, invited_at, accepted_at, patients:patient_id ( id, full_name, email )')
      .eq('family_patient_id', session.patientId),
  ])

  if (watchingMe.error) return NextResponse.json({ error: watchingMe.error.message }, { status: 500 })
  if (iAmWatching.error) return NextResponse.json({ error: iAmWatching.error.message }, { status: 500 })

  return NextResponse.json({
    myContacts: watchingMe.data,       // family members I've invited to watch ME
    watching: iAmWatching.data,        // patients who've invited ME to watch them
  })
}

export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { email?: string; relationship?: string | null }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })

  const db = getDb()
  const { data: familyPatient } = await db.from('patients').select('id, email').eq('email', email).maybeSingle()
  if (!familyPatient) {
    return NextResponse.json({ error: 'No account found with this email. Ask them to create an account first, then invite them again.' }, { status: 404 })
  }
  if (familyPatient.id === session.patientId) {
    return NextResponse.json({ error: 'You cannot add yourself as a family contact' }, { status: 400 })
  }

  const { data, error } = await db
    .from('family_contacts')
    .insert({
      patient_id: session.patientId,
      family_patient_id: familyPatient.id,
      relationship: body.relationship || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'This person is already invited' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
