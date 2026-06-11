import type { Metadata } from 'next'
import { OrganizationJsonLd, SoftwareApplicationJsonLd } from '@/components/public/JsonLd'
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
  title: 'MediVoice AI — AI Voice Agent for Clinics & Hospitals',
  description:
    'MediVoice AI is a 24/7 multilingual AI voice receptionist for Indian clinics and hospitals. Automate appointment booking, patient queries, reminders, and more. Get started in 48 hours.',
  alternates: { canonical: 'https://medivoice.ai' },
}

export default function HomePage() {
  return (
    <>
      <OrganizationJsonLd />
      <SoftwareApplicationJsonLd />
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
