import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import type { Metadata } from 'next'


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('name, logo_url')
    .eq('website_slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) return { title: 'Clinic' }

  // Fetch SEO from website content
  const { data: content } = await db
    .from('clinic_website_content')
    .select('seo_title, seo_description')
    .eq('clinic_id', (clinic as Record<string, unknown> & { id?: string }).id || '')
    .maybeSingle()

  return {
    title: (content as Record<string, unknown> | null)?.seo_title as string || `${clinic.name} — Book Appointment`,
    description: (content as Record<string, unknown> | null)?.seo_description as string || `Book an appointment at ${clinic.name}`,
    openGraph: {
      title: clinic.name,
      description: (content as Record<string, unknown> | null)?.seo_description as string || `Book an appointment at ${clinic.name}`,
      images: clinic.logo_url ? [{ url: clinic.logo_url }] : [],
    },
  }
}

export default async function ClinicPublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('id, website_enabled, is_active')
    .eq('website_slug', slug)
    .single()

  if (!clinic || !clinic.is_active) {
    notFound()
  }

  const themeColor = '#10b981'

  return (
    <>
      <style>{`
        :root {
          --clinic-accent: ${themeColor};
          --clinic-accent-hover: ${themeColor}dd;
          --clinic-accent-dim: ${themeColor}1a;
        }
      `}</style>
      {children}
    </>
  )
}
