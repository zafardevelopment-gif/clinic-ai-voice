import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'clinic_admin' || !session.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = getDb()

  const { data: clinic } = await db
    .from('clinics')
    .select('name, website_enabled, website_url, website_slug, phone, email, address, city, country, logo_url')
    .eq('id', session.clinicId)
    .single()

  if (!clinic?.website_enabled) {
    return NextResponse.json({ error: 'Website not enabled for this clinic' }, { status: 403 })
  }

  const { data: content } = await db
    .from('clinic_website_content')
    .select('*')
    .eq('clinic_id', session.clinicId)
    .maybeSingle()

  return NextResponse.json({ clinic_info: clinic, content: content || null })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'clinic_admin' || !session.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = getDb()

  const { data: clinic } = await db
    .from('clinics')
    .select('website_enabled')
    .eq('id', session.clinicId)
    .single()

  if (!clinic?.website_enabled) {
    return NextResponse.json({ error: 'Website not enabled for this clinic' }, { status: 403 })
  }

  const body = await req.json()

  const payload = {
    clinic_id: session.clinicId,
    hero_slides: body.hero_slides ?? [],
    about_title: body.about_title || null,
    about_text: body.about_text || null,
    services: body.services ?? [],
    contact_info: body.contact_info ?? {},
    seo_title: body.seo_title || null,
    seo_description: body.seo_description || null,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await db
    .from('clinic_website_content')
    .select('id')
    .eq('clinic_id', session.clinicId)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('clinic_website_content')
      .update(payload)
      .eq('clinic_id', session.clinicId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await db
      .from('clinic_website_content')
      .insert(payload)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
