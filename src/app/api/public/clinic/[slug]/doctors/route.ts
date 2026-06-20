import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// Public endpoint — no auth needed
// GET /api/public/clinic/[slug]/doctors
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const db = getDb()

  // First verify clinic exists and is active
  const { data: clinic } = await db
    .from('clinics')
    .select('id')
    .eq('website_slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  const { data: doctors, error } = await db
    .from('doctors')
    .select(
      'id, full_name, specialization, bio, avatar_url, ' +
      'years_of_experience, qualifications, consultation_fee, ' +
      'languages_spoken, slot_duration_minutes, booking_min_hours, ' +
      'booking_max_days, departments(name)'
    )
    .eq('clinic_id', clinic.id)
    .eq('is_active', true)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(doctors || [])
}
