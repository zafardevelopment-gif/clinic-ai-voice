import type { Metadata } from 'next'
import {
  OrganizationJsonLd,
  SoftwareApplicationJsonLd,
  LocalBusinessJsonLd,
  FaqPageJsonLd,
} from '@/components/public/JsonLd'
import HeroSection from '@/components/public/home/HeroSection'
import TrustSection from '@/components/public/home/TrustSection'
import ProblemSolutionSection from '@/components/public/home/ProblemSolutionSection'
import FeaturesSection from '@/components/public/home/FeaturesSection'
import HowItWorksSection from '@/components/public/home/HowItWorksSection'
import DashboardShowcase from '@/components/public/home/DashboardShowcase'
import TestimonialsSection from '@/components/public/home/TestimonialsSection'
import HomePricingSection from '@/components/public/home/HomePricingSection'
import HomeFaqSection from '@/components/public/home/HomeFaqSection'
import CtaSection from '@/components/public/home/CtaSection'

export const metadata: Metadata = {
  // Fixed: removed duplicate brand name from title
  title: 'MediVoice AI — AI Receptionist for Indian Clinics & Hospitals',
  description:
    'MediVoice AI is a 24/7 multilingual AI voice receptionist for Indian clinics and hospitals. Automate appointment booking, patient queries, reminders, and more. Setup in 48 hours.',
  keywords: [
    'AI receptionist for clinic',
    'automated clinic receptionist India',
    'AI appointment booking clinic',
    'clinic call automation',
    'AI voice agent healthcare India',
    'voice bot for hospital India',
    'clinic appointment scheduling software',
    'medical appointment booking AI',
  ],
  alternates: { canonical: 'https://medivoice.ai' },
  openGraph: {
    title: 'MediVoice AI — AI Receptionist for Indian Clinics & Hospitals',
    description:
      '24/7 multilingual AI voice receptionist. Automate appointment booking, patient queries, and clinic communication in Hindi, English & 8 more Indian languages.',
    url: 'https://medivoice.ai',
    siteName: 'MediVoice AI',
    images: [{ url: 'https://medivoice.ai/og-image.png', width: 1200, height: 630, alt: 'MediVoice AI Dashboard' }],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediVoice AI — AI Receptionist for Indian Clinics',
    description: '24/7 multilingual AI voice receptionist. Never miss a patient call again.',
    images: ['https://medivoice.ai/og-image.png'],
    creator: '@medivoiceai',
  },
}

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
      <LocalBusinessJsonLd />
      <FaqPageJsonLd />
      <HeroSection />
      <TrustSection />
      <ProblemSolutionSection />
      <FeaturesSection />
      <HowItWorksSection />
      <DashboardShowcase />
      <TestimonialsSection />
      <HomePricingSection />
      <HomeFaqSection />
      <CtaSection />
    </>
  )
}
