import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { signPatientAccessToken, signPatientRefreshToken } from '@/lib/patient-auth'

export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = body.email?.toLowerCase().trim()
  const password = body.password
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })

  const db = getDb()
  const { data: patient, error } = await db
    .from('patients')
    .select('id, email, full_name, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (error || !patient || !patient.password_hash) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, patient.password_hash)
  if (!valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

  await db.from('patients').update({ last_login_at: new Date().toISOString() }).eq('id', patient.id)

  const [accessToken, refreshToken] = await Promise.all([
    signPatientAccessToken(patient.id, patient.email!),
    signPatientRefreshToken(patient.id, patient.email!),
  ])

  return NextResponse.json({
    accessToken,
    refreshToken,
    patient: { id: patient.id, email: patient.email, full_name: patient.full_name },
  })
}
