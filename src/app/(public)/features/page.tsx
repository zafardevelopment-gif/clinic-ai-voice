import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calendar, RefreshCw, XCircle, User, Clock, HelpCircle, Globe, Phone,
  Bell, Users, Megaphone, AlertTriangle, HeartHandshake, CreditCard, BarChart2, Building2,
  ArrowRight, CheckCircle2
} from 'lucide-react'
import CtaSection from '@/components/public/home/CtaSection'

export const metadata: Metadata = {
  title: 'Features — AI Appointment Booking, Multi-Language Support & More | MediVoice AI',
  description:
    'Explore all 16+ features of MediVoice AI: AI appointment booking, rescheduling, multilingual support in Hindi/Tamil/Telugu, emergency escalation, analytics, and more for Indian clinics and hospitals.',
  keywords: [
    'AI appointment booking software',
    'clinic call automation features',
    'multilingual AI receptionist',
    'automated appointment scheduling India',
    'AI voice agent features healthcare',
    'clinic management automation',
  ],
  alternates: { canonical: 'https://medivoice.ai/features' },
  openGraph: {
    title: 'MediVoice AI Features — 16+ Tools for Clinic Automation',
    description: 'AI appointment booking, multilingual support, emergency escalation, analytics and more — purpose-built for Indian clinics.',
    url: 'https://medivoice.ai/features',
  },
}

const categories = [
  {
    title: 'Appointment Management',
    desc: 'Complete end-to-end appointment lifecycle automation',
    features: [
      {
        icon: Calendar,
        title: 'Appointment Booking',
        desc: 'Patients call and book appointments via natural voice conversation. AI checks real-time doctor availability and confirms instantly in any Indian language.',
        benefits: ['Available 24/7, even on holidays', 'No hold times', 'Instant SMS confirmation sent'],
      },
      {
        icon: RefreshCw,
        title: 'Rescheduling',
        desc: 'Patients can reschedule existing appointments easily. AI suggests the nearest available slot and updates the calendar automatically.',
        benefits: ['Zero friction for patients', 'Frees staff from rescheduling calls', 'Auto-updates dashboard'],
      },
      {
        icon: XCircle,
        title: 'Cancellation',
        desc: 'Cancellations are handled gracefully. The freed slot is automatically offered to waitlisted patients.',
        benefits: ['Reduce lost revenue from empty slots', 'Automatic waitlist notification', 'Seamless patient experience'],
      },
      {
        icon: Clock,
        title: 'Slot Suggestions',
        desc: 'When a preferred time is unavailable, AI proactively suggests the next best options, keeping patients engaged.',
        benefits: ['Higher booking conversion', 'No frustrated hang-ups', 'Smart slot optimization'],
      },
    ],
  },
  {
    title: 'Patient Communication',
    desc: 'Keep every patient informed and engaged',
    features: [
      {
        icon: HelpCircle,
        title: 'FAQ Handling',
        desc: 'Answers the most common patient queries — clinic timings, fees, doctor specialties, location, parking, and more — instantly and accurately.',
        benefits: ['Customizable FAQ library', 'Handles 80% of routine queries', 'Always accurate, never tired'],
      },
      {
        icon: Bell,
        title: 'Missed Call Callback',
        desc: 'When a patient cannot reach the clinic, MediVoice automatically schedules a callback and follows up.',
        benefits: ['Never lose a patient lead', 'Auto-scheduled callbacks', 'Full call tracking'],
      },
      {
        icon: Megaphone,
        title: 'Outbound Campaigns',
        desc: 'Send health tips, vaccination reminders, seasonal check-up campaigns, and follow-up calls to your patient database.',
        benefits: ['Increase patient retention', 'Drive preventive care visits', 'Measurable campaign analytics'],
      },
      {
        icon: HeartHandshake,
        title: 'Family Booking',
        desc: 'Book appointments for multiple family members in a single call — parents booking for children, carers for elderly patients.',
        benefits: ['Convenient for families', 'Higher per-call value', 'Reduces callback rates'],
      },
    ],
  },
  {
    title: 'Operational Excellence',
    desc: 'Tools that make your clinic run smoother',
    features: [
      {
        icon: User,
        title: 'Doctor Availability',
        desc: 'AI maintains live awareness of each doctor\'s schedule, leave, and availability — always up to date.',
        benefits: ['Zero double-bookings', 'Real-time schedule sync', 'Per-doctor configuration'],
      },
      {
        icon: Globe,
        title: 'Multi-Language Support',
        desc: 'Communicate in Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, and Punjabi.',
        benefits: ['Serve every patient in their language', 'Auto language detection', 'Regional accent support'],
      },
      {
        icon: Phone,
        title: 'Human Handoff',
        desc: 'Seamlessly transfer calls to staff when needed — for complex queries, escalations, or patient preference.',
        benefits: ['Warm call transfers', 'Context passed to agent', 'Configurable triggers'],
      },
      {
        icon: AlertTriangle,
        title: 'Emergency Escalation',
        desc: 'AI detects emergency keywords and escalates immediately to on-call doctors or emergency staff.',
        benefits: ['Configurable escalation contacts', 'Sub-second detection', 'Audit log of all escalations'],
      },
    ],
  },
  {
    title: 'Revenue & Analytics',
    desc: 'Maximize revenue and measure performance',
    features: [
      {
        icon: Users,
        title: 'Waitlist Management',
        desc: 'Patients can join a waitlist for fully booked slots. AI automatically notifies them when a cancellation occurs.',
        benefits: ['Fill every cancellation slot', 'Automatic notifications', 'Zero revenue leakage'],
      },
      {
        icon: CreditCard,
        title: 'Payment Collection',
        desc: 'Send Razorpay payment links via SMS or WhatsApp to collect consultation fees before the appointment.',
        benefits: ['Reduce no-shows by 60%', 'Seamless UPI/card payments', 'Automatic reconciliation'],
      },
      {
        icon: BarChart2,
        title: 'Analytics Dashboard',
        desc: 'Real-time visibility into call volume, booking rates, no-show trends, AI resolution rates, and revenue impact.',
        benefits: ['Daily/weekly/monthly views', 'Per-doctor analytics', 'Exportable reports'],
      },
      {
        icon: Building2,
        title: 'Multi-Clinic Support',
        desc: 'For healthcare chains: manage all clinics from a single admin dashboard. Per-clinic analytics and settings.',
        benefits: ['Centralized management', 'Per-clinic performance', 'Role-based access'],
      },
    ],
  },
]

export default function FeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-[#f6faf8] to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Features</span>
          <h1 className="font-syne font-bold text-4xl sm:text-5xl text-[#0f1f17] mb-5">
            Everything your clinic needs — in one AI voice agent
          </h1>
          <p className="text-xl text-[#4b5d54] mb-8 max-w-2xl mx-auto">
            16+ features purpose-built for Indian healthcare. From booking to billing, MediVoice AI handles it all.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/request-demo" className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
              Book a Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 px-6 py-3.5 border border-[#e4ebe7] hover:border-emerald-200 text-[#0f1f17] font-semibold rounded-xl transition-all">
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Feature categories */}
      {categories.map((cat, ci) => (
        <section key={cat.title} className={`py-16 ${ci % 2 === 0 ? 'bg-white' : 'bg-[#f6faf8]'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <h2 className="font-syne font-bold text-2xl sm:text-3xl text-[#0f1f17] mb-2">{cat.title}</h2>
              <p className="text-[#4b5d54]">{cat.desc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cat.features.map(({ icon: Icon, title, desc, benefits }) => (
                <div key={title} className="bg-white rounded-2xl p-6 border border-[#e4ebe7] hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="font-syne font-semibold text-lg text-[#0f1f17] mb-2">{title}</h3>
                  <p className="text-[#4b5d54] text-sm leading-relaxed mb-4">{desc}</p>
                  <ul className="space-y-1.5">
                    {benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-xs text-[#7a8d83]">{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <CtaSection />
    </>
  )
}
