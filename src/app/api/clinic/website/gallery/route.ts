import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

async function checkWebsiteAccess(clinicId: string) {
  const db = getDb()
  const { data } = await db
    .from('clinics')
    .select('website_enabled')
    .eq('id', clinicId)
    .single()
  return data?.website_enabled ?? false
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'clinic_admin' || !session.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!(await checkWebsiteAccess(session.clinicId))) {
    return NextResponse.json({ error: 'Website not enabled' }, { status: 403 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('clinic_gallery')
    .select('*')
    .eq('clinic_id', session.clinicId)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'clinic_admin' || !session.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  if (!(await checkWebsiteAccess(session.clinicId))) {
    return NextResponse.json({ error: 'Website not enabled' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  const db = getDb()

  // Get current max sort_order
  const { data: last } = await db
    .from('clinic_gallery')
    .select('sort_order')
    .eq('clinic_id', session.clinicId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sort_order = (last?.sort_order ?? 0) + 1

  const { data, error } = await db
    .from('clinic_gallery')
    .insert({
      clinic_id: session.clinicId,
      media_type: body.media_type || 'image',
      url: body.url,
      caption: body.caption || null,
      sort_order,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
