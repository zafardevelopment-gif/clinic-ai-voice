import { notFound, redirect } from 'next/navigation'
import { getDb } from '@/lib/db'

// This route handles custom domains.
// Middleware rewrites: drclinic.com → /c/__domain__?_domain=drclinic.com
// We look up the clinic by custom_domain and redirect to /c/[slug].
// domain_status must be 'verified' — a domain still pending DNS/SSL
// verification with Vercel shouldn't serve the site (Vercel itself
// wouldn't route traffic here until DNS resolves anyway, but this guards
// the case where DNS resolves before our verification check catches up).
export default async function CustomDomainResolver({
  searchParams,
}: {
  searchParams: { _domain?: string }
}) {
  const domain = searchParams._domain
  if (!domain) notFound()

  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('website_slug, domain_status')
    .eq('custom_domain', domain)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic || !clinic.website_slug || clinic.domain_status !== 'verified') notFound()

  redirect(`/c/${clinic.website_slug}`)
}
