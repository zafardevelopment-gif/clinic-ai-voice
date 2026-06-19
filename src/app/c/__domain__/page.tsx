import { notFound, redirect } from 'next/navigation'
import { getDb } from '@/lib/db'

// This route handles custom domains.
// Middleware rewrites: drclinic.com → /c/__domain__?_domain=drclinic.com
// We look up the clinic by custom_domain and redirect to /c/[slug]
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
    .select('slug')
    .eq('custom_domain', domain)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) notFound()

  redirect(`/c/${clinic.slug}`)
}
