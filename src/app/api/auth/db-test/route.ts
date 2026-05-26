import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const db = getDb()
    const { data, error, count } = await db
      .from('users')
      .select('email, role, is_active', { count: 'exact' })

    if (error) {
      return NextResponse.json({
        connected: false,
        error: error.message,
        hint: 'DB query failed — check SUPABASE_SERVICE_ROLE_KEY or RLS policies',
      }, { status: 500 })
    }

    return NextResponse.json({
      connected: true,
      userCount: count,
      users: data?.map(u => ({ email: u.email, role: u.role, is_active: u.is_active })),
    })
  } catch (err: unknown) {
    return NextResponse.json({
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      hint: 'Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local',
    }, { status: 500 })
  }
}
