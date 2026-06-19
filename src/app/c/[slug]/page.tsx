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
      'id, name, slug, tagline, theme_color, logo_url, website_about, website_hours, ' +
      'phone, email, address, city, country, ' +
      'social_facebook, social_instagram, social_whatsapp'
    )
    .eq('slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) notFound()

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

  return <ClinicSiteClient clinic={clinic} doctors={doctors || []} />
}
