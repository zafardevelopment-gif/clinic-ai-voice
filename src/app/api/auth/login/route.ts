import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { encodeSession, SESSION_COOKIE } from '@/lib/session'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const db = getDb()

    // Fetch user by email
    const { data: user, error } = await db
      .from('users')
      .select('id, email, password_hash, full_name, role, clinic_id, is_active')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Your account has been disabled' }, { status: 403 })
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Update last_login
    await db.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id)

    // Build session cookie
    const sessionToken = encodeSession({
      userId: user.id,
      email: user.email,
      role: user.role as 'admin' | 'clinic_admin',
      fullName: user.full_name,
      clinicId: user.clinic_id,
    })

    const response = NextResponse.json({
      ok: true,
      role: user.role,
      redirectTo: user.role === 'admin' ? '/admin/dashboard' : '/clinic/dashboard',
    })

    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (err) {
    console.error('/api/auth/login error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
