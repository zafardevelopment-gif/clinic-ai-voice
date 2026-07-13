import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { signPatientAccessToken, verifyPatientToken } from '@/lib/patient-auth'

/** POST /api/patient/auth/refresh — exchange a refresh token for a new short-lived access token. */
export async function POST(req: NextRequest) {
  let body: { refreshToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.refreshToken) return NextResponse.json({ error: 'refreshToken is required' }, { status: 400 })

  const payload = await verifyPatientToken(body.refreshToken)
  if (!payload || payload.type !== 'refresh') {
    return NextResponse.json({ error: 'Invalid or expired refresh token' }, { status: 401 })
  }

  const db = getDb()
  const { data: patient } = await db
    .from('patients')
    .select('id, email')
    .eq('id', payload.patientId)
    .maybeSingle()

  if (!patient) return NextResponse.json({ error: 'Account no longer exists' }, { status: 401 })

  const accessToken = await signPatientAccessToken(patient.id, patient.email!)
  return NextResponse.json({ accessToken })
}
