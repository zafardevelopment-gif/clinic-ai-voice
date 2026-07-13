import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

function generatePassword(): string {
  // 12 random alphanumeric chars — shown once to the admin, never stored in plaintext.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

/**
 * POST /api/admin/doctors/:id/reset-password
 *
 * Since passwords are bcrypt-hashed, an admin can never "view" a doctor's
 * existing password — this instead sets a NEW one and returns it once in
 * the response so the admin can hand it to the doctor. Nothing is persisted
 * in plaintext anywhere; the response is the only place it ever appears.
 *
 * If the doctor has no login yet, this creates one (using body.email, or
 * the doctor's own email on file). Body: { email?: string, password?: string }
 * — password is optional; if omitted, one is generated.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params

  let body: { email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const db = getDb()
  const { data: doctor } = await db.from('doctors').select('id, full_name, email, clinic_id').eq('id', id).maybeSingle()
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const password = body.password && body.password.length >= 8 ? body.password : generatePassword()
  if (body.password && body.password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }
  const password_hash = await bcrypt.hash(password, 12)

  const { data: existingUser } = await db.from('users').select('id, email').eq('doctor_id', id).maybeSingle()

  if (existingUser) {
    const { data: updated, error } = await db
      .from('users')
      .update({ password_hash })
      .eq('id', existingUser.id)
      .select('id, email')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ email: updated.email, password, created: false })
  }

  const email = (body.email || doctor.email)?.toLowerCase().trim()
  if (!email) return NextResponse.json({ error: 'This doctor has no email on file — provide one to create a login' }, { status: 400 })

  const { data: emailTaken } = await db.from('users').select('id').eq('email', email).maybeSingle()
  if (emailTaken) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

  const { data: created, error: createErr } = await db
    .from('users')
    .insert({
      email,
      password_hash,
      full_name: doctor.full_name,
      role: 'doctor',
      clinic_id: doctor.clinic_id,
      doctor_id: doctor.id,
    })
    .select('id, email')
    .single()

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 500 })
  return NextResponse.json({ email: created.email, password, created: true })
}
