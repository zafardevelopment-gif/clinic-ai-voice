import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/** GET /api/patient/care-navigator/flags — open + recent flags for the home screen banner. */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('care_navigator_flags')
    .select('*')
    .eq('patient_id', session.patientId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
