import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

// GET — fetch current website settings
export async function GET() {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('clinics')
    .select(
      'name, slug, website_enabled, custom_domain, tagline, theme_color, ' +
      'logo_url, website_about, website_hours, phone, email, address, city, country, ' +
      'social_facebook, social_instagram, social_whatsapp'
    )
    .eq('id', session.clinicId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH — update website settings
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Allowed fields clinic admin can update
  const allowed = [
    'website_enabled', 'tagline', 'theme_color', 'logo_url',
    'website_about', 'website_hours', 'phone', 'email', 'address',
    'city', 'country', 'social_facebook', 'social_instagram', 'social_whatsapp',
  ]

  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('clinics')
    .update(update)
    .eq('id', session.clinicId)
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
