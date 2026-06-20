import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import ClinicSiteClient from '@/components/clinic-site/ClinicSiteClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ClinicPublicPage({ params }: PageProps) {
  const { slug } = await params
  const db = getDb()

  const { data: clinic } = await db
    .from('clinics')
    .select(
      'id, name, website_slug, website_enabled, logo_url, ' +
      'phone, email, address, city, country'
    )
    .eq('website_slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) notFound()

  // Fetch website content (hero slides, gallery, about, services, contact, seo)
  const { data: websiteContent } = await db
    .from('clinic_website_content')
    .select('*')
    .eq('clinic_id', clinic.id)
    .maybeSingle()

  // Fetch gallery
  const { data: gallery } = await db
    .from('clinic_gallery')
    .select('*')
    .eq('clinic_id', clinic.id)
    .order('sort_order', { ascending: true })

  // Fetch doctors
  const { data: doctors } = await db
    .from('doctors')
    .select(
      'id, full_name, specialization, bio, avatar_url, ' +
      'years_of_experience, qualifications, consultation_fee, ' +
      'languages_spoken, slot_duration_minutes, booking_min_hours, booking_max_days, ' +
      'departments(name)'
    )
    .eq('clinic_id', clinic.id)
    .eq('is_active', true)
    .order('full_name')

  return (
    <ClinicSiteClient
      clinic={clinic}
      websiteContent={websiteContent || null}
      gallery={gallery || []}
      doctors={doctors || []}
    />
  )
}
