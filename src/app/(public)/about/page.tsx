import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Target, Heart, Zap, Shield } from 'lucide-react'
import CtaSection from '@/components/public/home/CtaSection'

export const metadata: Metadata = {
  title: 'About MediVoice AI — Built for Indian Clinics & Hospitals',
  description:
    'Learn about MediVoice AI — an Indian healthcare AI company on a mission to make quality care accessible by automating clinic reception with multilingual voice AI.',
  keywords: [
    'MediVoice AI company',
    'Indian healthcare AI startup',
    'clinic automation India team',
    'AI voice agent healthcare India',
    'about MediVoice AI',
  ],
  alternates: { canonical: 'https://medivoice.ai/about' },
  openGraph: {
    title: 'About MediVoice AI — Indian Healthcare AI Company',
    description: 'We build AI receptionists for Indian clinics and hospitals — multilingual, 24/7, and ready in 48 hours.',
    url: 'https://medivoice.ai/about',
  },
}

const values = [
  { icon: Target, title: 'Patient First', desc: 'Every feature we build starts with a question: does this make it easier for a patient to access care?' },
  { icon: Heart, title: 'Clinic Empathy', desc: 'We understand the constraints of running a clinic in India. Our solutions are practical, not just technically impressive.' },
  { icon: Zap, title: 'Speed & Reliability', desc: 'Healthcare cannot wait. Our AI responds in under 2 seconds and maintains 99.9% uptime.' },
  { icon: Shield, title: 'Data Integrity', desc: 'Patient data is sacred. We build with privacy-by-design and HIPAA-ready architecture from day one.' },
]

const team = [
  { name: 'Arjun Menon', role: 'CEO & Co-founder', bio: 'Former product lead at a healthcare startup. Passionate about making healthcare accessible through technology.' },
  { name: 'Divya Krishnan', role: 'CTO & Co-founder', bio: '10+ years in AI/ML and voice technology. Previously led voice AI teams at a major Indian tech company.' },
  { name: 'Rohan Sharma', role: 'Head of Growth', bio: 'Healthcare SaaS specialist with experience scaling clinic management software across India.' },
  { name: 'Priya Nair', role: 'Head of Customer Success', bio: 'Former clinic administrator who has sat on both sides of the reception desk. Ensures every clinic achieves ROI.' },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-[#f6faf8] to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">About Us</span>
          <h1 className="font-syne font-bold text-4xl sm:text-5xl text-[#0f1f17] mb-6">
            We believe every patient deserves to be heard
          </h1>
          <p className="text-xl text-[#4b5d54] max-w-2xl mx-auto">
            MediVoice AI was founded by a team of healthcare and AI professionals who saw a clear problem:
            Indian clinics were losing patients to missed calls, and patients were losing trust to poor communication.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-syne font-bold text-3xl text-[#0f1f17] mb-5">Our mission</h2>
              <p className="text-[#4b5d54] leading-relaxed mb-5">
                India has over 800,000 registered clinics and hospitals. Most of them rely on a single
                overworked receptionist to manage all patient communication — resulting in missed calls,
                delayed bookings, and frustrated patients.
              </p>
              <p className="text-[#4b5d54] leading-relaxed mb-5">
                We built MediVoice AI to give every clinic — from a solo GP in a small town to a large
                hospital group in a metro — the same communication capability as the best-resourced
                healthcare facilities.
              </p>
              <p className="text-[#4b5d54] leading-relaxed">
                Our AI speaks the patient&apos;s language, works 24/7, never misses a call, and gives clinic
                owners real-time visibility into their communication — at a price that makes sense for India.
              </p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-8 text-white">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { value: '800K+', label: 'Clinics in India we can serve' },
                  { value: '50+', label: 'Clinics using MediVoice today' },
                  { value: '2L+', label: 'Patient calls handled' },
                  { value: '48hr', label: 'Average setup time' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="font-syne font-bold text-3xl">{s.value}</p>
                    <p className="text-emerald-100 text-sm mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-[#f6faf8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-syne font-bold text-2xl sm:text-3xl text-[#0f1f17] text-center mb-10">Our values</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-[#e4ebe7]">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-syne font-semibold text-[#0f1f17] mb-2">{title}</h3>
                <p className="text-sm text-[#4b5d54] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-syne font-bold text-2xl sm:text-3xl text-[#0f1f17] text-center mb-10">Meet the team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((m) => (
              <div key={m.name} className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                  {m.name.split(' ').map((w) => w[0]).join('')}
                </div>
                <h3 className="font-syne font-semibold text-[#0f1f17]">{m.name}</h3>
                <p className="text-xs text-emerald-600 font-medium mb-2">{m.role}</p>
                <p className="text-xs text-[#7a8d83] leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
