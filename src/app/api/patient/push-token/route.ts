import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/** POST /api/patient/push-token — register/update this device's Expo push token. */
export async function POST(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { expo_push_token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!body.expo_push_token) return NextResponse.json({ error: 'expo_push_token is required' }, { status: 400 })

  const db = getDb()
  const { error } = await db
    .from('patients')
    .update({ expo_push_token: body.expo_push_token })
    .eq('id', session.patientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
