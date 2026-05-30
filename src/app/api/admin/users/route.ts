import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

// Lists all users (admin only). Service-role DB client so RLS doesn't hide
// rows from our cookie-session admin.
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('users')
    .select('id, email, full_name, role, clinic_id, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
