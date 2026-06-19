import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

const DOCTOR_SELECT = 'id, full_name, specialization, phone, email, bio, department_id, is_active, booking_min_hours, booking_max_days, slot_duration_minutes, clinic_id, avatar_url, years_of_experience, qualifications, consultation_fee, languages_spoken, created_at, updated_at, departments(name)'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()
  const { data, error } = await db
    .from('doctors')
    .select(DOCTOR_SELECT)
    .eq('clinic_id', clinicId)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clinicId = session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const body = await req.json()
  const db = getDb()
  const { data, error } = await db
    .from('doctors')
    .insert({
      full_name: body.full_name,
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
      clinic_id: clinicId,
    })
    .select(DOCTOR_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
