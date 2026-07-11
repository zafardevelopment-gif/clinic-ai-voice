import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { addDomainToProject, removeDomainFromProject } from '@/lib/vercel/domains'

// Basic hostname shape check — full validation happens on Vercel's side,
// this just stops obviously-wrong input before a wasted API call.
const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i

/**
 * GET    /api/clinic/website/domain   current domain + status
 * POST   /api/clinic/website/domain   { domain } — register a new custom domain
 * DELETE /api/clinic/website/domain   disconnect the current domain
 */
export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'clinic_admin' || !session.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = getDb()
  const { data: clinic, error } = await db
    .from('clinics')
    .select('custom_domain, domain_status, domain_verification, domain_added_at, domain_checked_at')
    .eq('id', session.clinicId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(clinic)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'clinic_admin' || !session.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: { domain?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const domain = body.domain?.trim().toLowerCase()
  if (!domain || !DOMAIN_RE.test(domain)) {
    return NextResponse.json({ error: 'Enter a valid domain, e.g. drclinic.com or booking.drclinic.com' }, { status: 400 })
  }

  const db = getDb()

  const { data: clinic } = await db
    .from('clinics')
    .select('website_enabled, website_slug')
    .eq('id', session.clinicId)
    .single()

  if (!clinic?.website_enabled || !clinic?.website_slug) {
    return NextResponse.json({ error: 'Enable your website and set a page URL before connecting a custom domain.' }, { status: 400 })
  }

  try {
    const result = await addDomainToProject(domain)

    const { data, error } = await db
      .from('clinics')
      .update({
        custom_domain: domain,
        domain_status: result.verified ? 'verified' : 'pending',
        domain_verification: result.verification as unknown as import('@/types/database').Json,
        domain_added_at: new Date().toISOString(),
        domain_checked_at: new Date().toISOString(),
      })
      .eq('id', session.clinicId)
      .select('custom_domain, domain_status, domain_verification')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

export async function DELETE() {
  const session = await getSession()
  if (!session || session.role !== 'clinic_admin' || !session.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('custom_domain')
    .eq('id', session.clinicId)
    .single()

  if (clinic?.custom_domain) {
    try {
      await removeDomainFromProject(clinic.custom_domain)
    } catch (err) {
      // Non-fatal: still clear our own record even if Vercel's side lags/fails,
      // so the clinic isn't stuck. A stale Vercel domain entry pointed at an
      // unlisted clinic is harmless — it'll just 404 through our resolver.
      console.warn('[domain] removeDomainFromProject failed (non-fatal):', err)
    }
  }

  const { error } = await db
    .from('clinics')
    .update({
      custom_domain: null,
      domain_status: 'unset',
      domain_verification: null,
      domain_added_at: null,
      domain_checked_at: null,
    })
    .eq('id', session.clinicId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
