/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * PATCH  /api/admin/doctors/:id   update a doctor (any clinic — admin scope)
 * DELETE /api/admin/doctors/:id   delete a doctor
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const ALLOWED_FIELDS = [
    'full_name', 'specialization', 'phone', 'email', 'bio', 'department_id',
    'is_active', 'booking_min_hours', 'booking_max_days', 'slot_duration_minutes',
    'years_of_experience', 'qualifications', 'consultation_fee', 'languages_spoken', 'avatar_url',
  ]
  const update: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (key in body) update[key] = body[key]
  }

  const db = getDb()
  // Cast to `any`: same pre-existing supabase-js overload-inference
  // limitation as api/admin/doctors/route.ts — a dynamically-built update
  // object plus a multi-relation select string defeats type inference.
  const { data, error } = await (db.from('doctors') as any)
    .update(update)
    .eq('id', id)
    .select('id, full_name, specialization, phone, email, bio, department_id, is_active, booking_min_hours, booking_max_days, slot_duration_minutes, clinic_id, avatar_url, years_of_experience, qualifications, consultation_fee, languages_spoken, created_at, updated_at, clinics(name), departments(name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  const { id } = await params

  const db = getDb()
  const { error } = await db.from('doctors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
