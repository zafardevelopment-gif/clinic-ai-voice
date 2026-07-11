import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { checkDomainStatus } from '@/lib/vercel/domains'

/**
 * POST /api/clinic/website/domain/check
 *
 * Re-checks the current domain's verification status with Vercel and
 * updates clinics.domain_status. The UI polls this while status='pending'.
 */
export async function POST() {
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

  if (!clinic?.custom_domain) {
    return NextResponse.json({ error: 'No custom domain configured' }, { status: 400 })
  }

  try {
    const result = await checkDomainStatus(clinic.custom_domain)
    const status = result.verified ? 'verified' : result.misconfigured ? 'error' : 'pending'

    const { data, error } = await db
      .from('clinics')
      .update({ domain_status: status, domain_checked_at: new Date().toISOString() })
      .eq('id', session.clinicId)
      .select('custom_domain, domain_status, domain_checked_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
