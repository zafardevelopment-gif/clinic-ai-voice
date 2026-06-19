import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import type { Metadata } from 'next'


export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params
  const db = getDb()
  const { data: clinic } = await db
    .from('clinics')
    .select('name, tagline, logo_url')
    .eq('slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) return { title: 'Clinic' }

  return {
    title: `${clinic.name} — Book Appointment`,
    description: clinic.tagline || `Book an appointment at ${clinic.name}`,
    openGraph: {
      title: clinic.name,
      description: clinic.tagline || `Book an appointment at ${clinic.name}`,
      images: clinic.logo_url ? [{ url: clinic.logo_url }] : [],
    },
  }
}

export default async function ClinicPublicLayout({ children, params }: { children: React.ReactNode; params: { slug: string } }) {
  const { slug } = params
  const db = getDb()
  const { data: clinic, error } = await db
    .from('clinics')
    .select('id, website_enabled, is_active, theme_color')
    .eq('slug', slug)
    .single()

  if (!clinic || !clinic.is_active || !clinic.website_enabled) {
    notFound()
  }

  const themeColor = clinic.theme_color || '#10b981'

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
