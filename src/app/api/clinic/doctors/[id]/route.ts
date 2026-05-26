import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

const DOCTOR_SELECT = 'id, full_name, specialization, phone, email, bio, department_id, is_active, booking_min_hours, booking_max_days, slot_duration_minutes, clinic_id, avatar_url, years_of_experience, qualifications, consultation_fee, languages_spoken, created_at, updated_at, departments(name)'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const db = getDb()
  const { data, error } = await db
    .from('doctors')
    .update(body)
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId!)
    .select(DOCTOR_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { error } = await db
    .from('doctors')
    .delete()
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId!)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
