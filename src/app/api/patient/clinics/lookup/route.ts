import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getPatientSession } from '@/lib/patient-auth'

/**
 * GET /api/patient/clinics/lookup?slug=<website_slug>
 *
 * Lets a signed-in patient look up a clinic by its public website_slug
 * (the same code a clinic's public site is reachable at, /c/[slug]) before
 * confirming the "link to this clinic" action. Returns only clinic display
 * fields — never anything patient-identifying from other patients.
 */
export async function GET(req: NextRequest) {
  const session = await getPatientSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('slug')?.trim().toLowerCase()
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })

  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('id, name, city, website_slug')
    .eq('website_slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!clinic) return NextResponse.json({ error: 'No clinic found with that code' }, { status: 404 })

  return NextResponse.json({ id: clinic.id, name: clinic.name, city: clinic.city, slug: clinic.website_slug })
}
