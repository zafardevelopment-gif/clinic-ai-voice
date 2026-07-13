import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/**
 * GET /api/patient/profile   own profile
 * PUT /api/patient/profile   update own profile (name/DOB/gender/address only — never email/password here)
 */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('patients')
    .select('id, full_name, email, phone, date_of_birth, gender, address, is_independent, subscription_status, clinic_id')
    .eq('id', session.patientId)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: {
    full_name?: string
    phone?: string | null
    date_of_birth?: string | null
    gender?: string | null
    address?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('patients')
    .update({
      ...(body.full_name ? { full_name: body.full_name } : {}),
      phone: body.phone ?? null,
      date_of_birth: body.date_of_birth ?? null,
      gender: body.gender ?? null,
      address: body.address ?? null,
    })
    .eq('id', session.patientId)
    .select('id, full_name, email, phone, date_of_birth, gender, address')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
