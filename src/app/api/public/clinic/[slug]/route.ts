import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// Public endpoint — no auth needed
// GET /api/public/clinic/[slug]
export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const db = getDb()

  const { data: clinic, error } = await db
    .from('clinics')
    .select(
      'id, name, slug, tagline, theme_color, logo_url, website_about, website_hours, ' +
      'phone, email, address, city, country, ' +
      'social_facebook, social_instagram, social_whatsapp, website_enabled'
    )
    .eq('slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (error || !clinic) {
    return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  }

  return NextResponse.json(clinic)
}
