import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'

/**
 * Manage the login (users row) linked to a doctor via users.doctor_id.
 * A doctor's clinical profile (doctors table) and their login account
 * (users table) are separate — this route creates/resets/revokes the login.
 */

function generateTempPassword() {
  return Math.random().toString(36).slice(-4).toUpperCase() +
    Math.random().toString(36).slice(-4) + '!1'
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !requireRole(session, ['clinic_admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()

  const { data: doctor, error: docErr } = await db
    .from('doctors')
    .select('id, full_name, email, clinic_id')
    .eq('id', params.id)
    .eq('clinic_id', clinicId)
    .single()
  if (docErr || !doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const { data: existingLogin } = await db
    .from('users')
    .select('id')
    .eq('doctor_id', doctor.id)
    .maybeSingle()
  if (existingLogin) {
    return NextResponse.json({ error: 'This doctor already has a login' }, { status: 409 })
  }

  const body = await req.json().catch(() => ({}))
  const email: string | undefined = body.email || doctor.email || undefined
  if (!email) {
    return NextResponse.json({ error: 'Email is required to create a login' }, { status: 400 })
  }
  const normalizedEmail = email.toLowerCase().trim()

  const { data: emailTaken } = await db
    .from('users')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (emailTaken) {
    return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })
  }

  const password: string = body.password || generateTempPassword()
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  const password_hash = await bcrypt.hash(password, 12)

  const { data: newUser, error } = await db
    .from('users')
    .insert({
      email: normalizedEmail,
      password_hash,
      full_name: doctor.full_name,
      role: 'doctor',
      clinic_id: clinicId,
      doctor_id: doctor.id,
    })
    .select('id, email')
    .single()

  if (error || !newUser) {
    return NextResponse.json({ error: error?.message || 'Failed to create login' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    email: newUser.email,
    // Only returned once, at creation time — never stored or retrievable again.
    temporaryPassword: body.password ? undefined : password,
  }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !requireRole(session, ['clinic_admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()
  const { data: doctor } = await db
    .from('doctors')
    .select('id')
    .eq('id', params.id)
    .eq('clinic_id', clinicId)
    .single()
  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const password: string = body.password || generateTempPassword()
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  const password_hash = await bcrypt.hash(password, 12)

  const { data: updated, error } = await db
    .from('users')
    .update({ password_hash })
    .eq('doctor_id', doctor.id)
    .eq('clinic_id', clinicId)
    .select('id, email')
    .single()

  if (error || !updated) {
    return NextResponse.json({ error: error?.message || 'No login found for this doctor' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    email: updated.email,
    temporaryPassword: body.password ? undefined : password,
  })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !requireRole(session, ['clinic_admin'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()
  const { error } = await db
    .from('users')
    .delete()
    .eq('doctor_id', params.id)
    .eq('clinic_id', clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
