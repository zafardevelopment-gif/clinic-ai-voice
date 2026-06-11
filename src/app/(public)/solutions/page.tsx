import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import CtaSection from '@/components/public/home/CtaSection'

export const metadata: Metadata = {
  title: 'Solutions — MediVoice AI for Clinics & Hospitals',
  description:
    'MediVoice AI solutions for dental clinics, general practitioners, specialist centres, multi-specialty hospitals, and clinic chains. Discover how we serve your practice type.',
  alternates: { canonical: 'https://medivoice.ai/solutions' },
}

const solutions = [
  {
    tag: 'Dental Clinics',
    headline: 'Fill every chair, every hour',
    desc: 'Dental clinics depend on high appointment volume. MediVoice AI ensures every incoming call is answered, every booking confirmed, and every no-show followed up — so your chairs are never empty.',
    outcomes: [
      '30% reduction in no-shows with automated reminders',
      '24/7 appointment booking — even on Sundays',
      'Automatic waitlist filling when cancellations occur',
      'Multi-doctor scheduling for large dental practices',
    ],
    color: 'emerald',
  },
  {
    tag: 'General Practitioners',
    headline: 'Focus on patients, not the phone',
    desc: 'GP clinics receive dozens of repetitive calls daily. MediVoice AI handles appointment booking, prescription queries, test result inquiries, and routine FAQs — freeing your receptionist for in-clinic patients.',
    outcomes: [
      '80% of routine calls handled without staff',
      'Available in patient\'s native language',
      'Prescription renewal and follow-up reminders',
      'Emergency escalation to on-call GP',
    ],
    color: 'teal',
  },
  {
    tag: 'Specialist Centres',
    headline: 'Specialist-aware scheduling',
    desc: 'Orthopaedic, cardiology, dermatology, ENT, and other specialist clinics need smart scheduling that accounts for consultation duration, procedure types, and doctor availability. MediVoice AI handles all of it.',
    outcomes: [
      'Specialty-specific FAQ handling',
      'Procedure vs consultation slot differentiation',
      'Referral query management',
      'Insurance pre-authorization reminders',
    ],
    color: 'violet',
  },
  {
    tag: 'Multi-Specialty Hospitals',
    headline: 'One AI for your entire hospital',
    desc: 'Large hospitals with multiple departments, dozens of doctors, and complex scheduling rules. MediVoice AI manages it all with department-aware routing and real-time availability tracking.',
    outcomes: [
      'Department-level scheduling and routing',
      'Emergency and OPD queue management',
      'Discharge follow-up calls',
      'Complete analytics across all departments',
    ],
    color: 'blue',
  },
  {
    tag: 'Clinic Chains',
    headline: 'Centralized control, local flexibility',
    desc: 'Running 3, 7, or 30 clinics? MediVoice AI gives you a centralized admin dashboard with per-clinic analytics, settings, and performance tracking — at the scale you need.',
    outcomes: [
      'Single admin portal for all locations',
      'Per-clinic or group-wide analytics',
      'Standardized patient experience across locations',
      'Multi-city, multi-language coverage',
    ],
    color: 'amber',
  },
  {
    tag: 'Diagnostic Centres',
    headline: 'Automate test bookings and result queries',
    desc: 'Diagnostic centres manage high call volumes for test bookings, sample collection scheduling, and result inquiries. MediVoice AI handles all three — 24/7.',
    outcomes: [
      'Test booking and slot scheduling',
      'Home sample collection coordination',
      'Result availability notifications',
      'Report download link via SMS/WhatsApp',
    ],
    color: 'rose',
  },
]

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  violet: 'bg-violet-50 border-violet-200 text-violet-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  rose: 'bg-rose-50 border-rose-200 text-rose-700',
}

export default function SolutionsPage() {
  return (
    <>
      <section className="pt-28 pb-16 bg-gradient-to-b from-[#f6faf8] to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Solutions</span>
          <h1 className="font-syne font-bold text-4xl sm:text-5xl text-[#0f1f17] mb-5">
            Built for every type of healthcare practice
          </h1>
          <p className="text-xl text-[#4b5d54] max-w-2xl mx-auto">
            Whether you run a solo practice or a hospital group, MediVoice AI adapts to your specialization, volume, and workflow.
          </p>
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solutions.map((s) => (
              <div key={s.tag} className="bg-white rounded-2xl border border-[#e4ebe7] p-7 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border mb-4 ${colorMap[s.color]}`}>
                  {s.tag}
                </span>
                <h2 className="font-syne font-bold text-xl text-[#0f1f17] mb-3">{s.headline}</h2>
                <p className="text-sm text-[#4b5d54] leading-relaxed mb-5">{s.desc}</p>
                <ul className="space-y-2 mb-6">
                  {s.outcomes.map((o) => (
                    <li key={o} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-[#4b5d54]">{o}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/request-demo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  See how it works <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaSection />
    </>
  )
}
