import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import TriageFormClient from '@/components/clinic-site/TriageFormClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ClinicTriagePage({ params }: PageProps) {
  const { slug } = await params
  const db = getDb()

  const { data: clinic } = await db
    .from('clinics')
    .select('id, name, website_slug, website_enabled, logo_url')
    .eq('website_slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) notFound()

  return <TriageFormClient clinicName={clinic.name} slug={slug} />
}
