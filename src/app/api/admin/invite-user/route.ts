import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  // Only admins can create users
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { email, full_name, role, clinic_id, password } = await req.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'email, password and role are required' }, { status: 400 })
    }

    const db = getDb()

    // Check if email already exists
    const { data: existing } = await db.from('users').select('id').eq('email', email.toLowerCase().trim()).single()
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 12)

    const { data: newUser, error } = await db
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash,
        full_name: full_name || null,
        role: role as 'admin' | 'clinic_admin',
        clinic_id: clinic_id || null,
      })
      .select('id')
      .single()

    if (error || !newUser) {
      console.error('Failed to create user:', error)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user_id: newUser.id }, { status: 201 })
  } catch (err) {
    console.error('/api/admin/invite-user error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
