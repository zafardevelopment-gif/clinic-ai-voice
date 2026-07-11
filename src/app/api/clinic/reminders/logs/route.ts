/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

// Lists reminder-call logs for the logged-in user's clinic. Service-role DB
// client so RLS doesn't hide rows from our cookie-session users.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') || 'all'

  const db = getDb() as any
  let q = db
    .from('appointment_reminders')
    .select(`
      id, type, status, response, channel, scheduled_at, placed_at, ended_at,
      to_number, duration_seconds, dtmf_received, attempt, error_message,
      patients ( full_name ),
      appointments ( appointment_date, appointment_time )
    `)
    .eq('clinic_id', clinicId)
    .order('scheduled_at', { ascending: false })
    .limit(200)

  if (status !== 'all') q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
