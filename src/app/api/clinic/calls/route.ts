import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

// Lists call logs for the logged-in user's clinic. Uses the service-role DB
// client so it works regardless of RLS (the cookie session, not Supabase Auth,
// is the source of truth for who may read what).
export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()
  const { data, error } = await db
    .from('calls')
    .select('*, patients(full_name)')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
