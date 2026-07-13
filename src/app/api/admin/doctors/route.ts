/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

const DOCTOR_SELECT =
  'id, full_name, specialization, phone, email, bio, department_id, is_active, ' +
  'booking_min_hours, booking_max_days, slot_duration_minutes, clinic_id, avatar_url, ' +
  'years_of_experience, qualifications, consultation_fee, languages_spoken, created_at, updated_at, ' +
  'clinics(name), departments(name)'

/**
 * GET  /api/admin/doctors[?clinic_id=]   all doctors (optionally filtered to one clinic)
 * POST /api/admin/doctors                create a doctor for a clinic, optionally with a login
 *
 * Admin-only — same auth pattern as the rest of src/app/api/admin/*.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const clinicId = req.nextUrl.searchParams.get('clinic_id')
  const db = getDb()

  // Cast to `any`: supabase-js's type resolver can't reliably infer a row
  // type for a select string spanning two joined relations
  // (clinics(name), departments(name)) — same pre-existing overload-
  // inference limitation as clinic_invoices/contact-inquiry elsewhere in
  // this codebase.
  let q = (db.from('doctors') as any).select(DOCTOR_SELECT).order('full_name')
  if (clinicId) q = q.eq('clinic_id', clinicId)

  const { data: doctors, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!doctors || doctors.length === 0) return NextResponse.json([])

  // Attach each doctor's login account (userid/email), if one exists —
  // users.doctor_id links a login back to a doctor row (see database.ts).
  const doctorIds = doctors.map((d: any) => d.id)
  const { data: users } = await db
    .from('users')
    .select('id, email, doctor_id, is_active, last_login')
    .in('doctor_id', doctorIds)

  const userByDoctorId = new Map((users || []).map(u => [u.doctor_id, u]))
  const result = doctors.map((d: any) => ({ ...d, login: userByDoctorId.get(d.id) || null }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: {
    clinic_id?: string
    full_name?: string
    specialization?: string | null
    phone?: string | null
    email?: string | null
    bio?: string | null
    department_id?: string | null
    booking_min_hours?: number
    booking_max_days?: number
    slot_duration_minutes?: number
    years_of_experience?: number | null
    qualifications?: string | null
    consultation_fee?: number | null
    languages_spoken?: string[] | null
    avatar_url?: string | null
    // Optional: create a login for this doctor at the same time.
    create_login?: boolean
    login_email?: string
    login_password?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.clinic_id) return NextResponse.json({ error: 'clinic_id is required' }, { status: 400 })
  if (!body.full_name?.trim()) return NextResponse.json({ error: 'full_name is required' }, { status: 400 })

  const db = getDb()

  const { data: doctor, error } = await (db.from('doctors') as any)
    .insert({
      full_name: body.full_name.trim(),
      specialization: body.specialization || null,
      phone: body.phone || null,
      email: body.email || null,
      bio: body.bio || null,
      department_id: body.department_id || null,
      booking_min_hours: body.booking_min_hours ?? 2,
      booking_max_days: body.booking_max_days ?? 30,
      slot_duration_minutes: body.slot_duration_minutes ?? 30,
      years_of_experience: body.years_of_experience ?? null,
      qualifications: body.qualifications || null,
      consultation_fee: body.consultation_fee ?? null,
      languages_spoken: body.languages_spoken || null,
      avatar_url: body.avatar_url || null,
      clinic_id: body.clinic_id,
    })
    .select(DOCTOR_SELECT)
    .single()

  if (error || !doctor) return NextResponse.json({ error: error?.message || 'Failed to create doctor' }, { status: 500 })

  let login = null
  if (body.create_login) {
    if (!body.login_email || !body.login_password) {
      return NextResponse.json({ error: 'login_email and login_password are required to create a login' }, { status: 400 })
    }
    if (body.login_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const email = body.login_email.toLowerCase().trim()
    const { data: existing } = await db.from('users').select('id').eq('email', email).maybeSingle()
    if (existing) return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 })

    const password_hash = await bcrypt.hash(body.login_password, 12)
    const { data: user, error: userErr } = await db
      .from('users')
      .insert({
        email,
        password_hash,
        full_name: doctor.full_name,
        role: 'doctor',
        clinic_id: body.clinic_id,
        doctor_id: doctor.id,
      })
      .select('id, email, is_active, last_login')
      .single()

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 })
    login = user
  }

  return NextResponse.json({ ...doctor, login }, { status: 201 })
}
