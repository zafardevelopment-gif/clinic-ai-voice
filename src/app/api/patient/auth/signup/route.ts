import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signPatientAccessToken, signPatientRefreshToken } from '@/lib/patient-auth'

/**
 * POST /api/patient/auth/signup — self-registration for an independent
 * (non-clinic) patient. Clinic-created patients never hit this route; staff
 * add them via /api/clinic/patients and those rows have no password_hash.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; full_name?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  const password = body.password
  const fullName = body.full_name?.trim()

  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  if (!password || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  if (!fullName) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })

  const db = getDb()

  const { data: existing } = await db
    .from('patients')
    .select('id')
    .eq('email', email)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })

  const passwordHash = await bcrypt.hash(password, 10)

  const { data: patient, error } = await db
    .from('patients')
    .insert({
      full_name: fullName,
      email,
      password_hash: passwordHash,
      is_independent: true,
      clinic_id: null,
    })
    .select('id, email, full_name')
    .single()

  if (error || !patient) return NextResponse.json({ error: error?.message || 'Failed to create account' }, { status: 500 })

  const [accessToken, refreshToken] = await Promise.all([
    signPatientAccessToken(patient.id, patient.email!),
    signPatientRefreshToken(patient.id, patient.email!),
  ])

  return NextResponse.json({
    accessToken,
    refreshToken,
    patient: { id: patient.id, email: patient.email, full_name: patient.full_name },
  }, { status: 201 })
}
