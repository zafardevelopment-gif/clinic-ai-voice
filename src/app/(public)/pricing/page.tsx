import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, X, ArrowRight, Zap, Building, Building2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Pricing — MediVoice AI',
  description:
    'Simple, transparent pricing for MediVoice AI. Starter, Professional, and Enterprise plans for clinics and hospital groups. 14-day free trial.',
  alternates: { canonical: 'https://medivoice.ai/pricing' },
}

const plans = [
  {
    icon: Zap,
    name: 'Starter',
    tagline: 'Solo practitioners & small clinics',
    price: '₹2,999',
    priceNote: 'per month · 14-day free trial included',
    highlight: false,
    features: [
      { label: 'AI calls per month', value: '500' },
      { label: 'Appointment booking & rescheduling', value: true },
      { label: 'Cancellations & waitlist', value: true },
      { label: 'Languages', value: 'English + 1 regional' },
      { label: 'Basic call analytics', value: true },
      { label: 'SMS confirmations', value: true },
      { label: 'Human handoff', value: false },
      { label: 'Outbound campaigns', value: false },
      { label: 'Payment collection', value: false },
      { label: 'API / integrations', value: false },
      { label: 'Clinic locations', value: '1' },
      { label: 'Support', value: 'Email' },
    ],
    cta: 'Request Demo',
    href: '/request-demo',
  },
  {
    icon: Building,
    name: 'Professional',
    tagline: 'Growing clinics & specialist centres',
    price: 'Contact for pricing',
    priceNote: 'per month',
    highlight: true,
    features: [
      { label: 'AI calls per month', value: '2,000' },
      { label: 'Appointment booking & rescheduling', value: true },
      { label: 'Cancellations & waitlist', value: true },
      { label: 'Languages', value: 'All 10 languages' },
      { label: 'Advanced analytics dashboard', value: true },
      { label: 'SMS + WhatsApp confirmations', value: true },
      { label: 'Human handoff', value: true },
      { label: 'Outbound campaigns', value: true },
      { label: 'Payment collection', value: true },
      { label: 'API / integrations', value: 'REST API' },
      { label: 'Clinic locations', value: 'Up to 3' },
      { label: 'Support', value: 'Priority email & chat' },
    ],
    cta: 'Get Started',
    href: '/request-demo',
  },
  {
    icon: Building2,
    name: 'Enterprise',
    tagline: 'Hospital groups & clinic chains',
    price: 'Custom pricing',
    priceNote: 'tailored to your scale',
    highlight: false,
    features: [
      { label: 'AI calls per month', value: 'Unlimited' },
      { label: 'Appointment booking & rescheduling', value: true },
      { label: 'Cancellations & waitlist', value: true },
      { label: 'Languages', value: 'All + custom dialects' },
      { label: 'Advanced analytics dashboard', value: true },
      { label: 'SMS + WhatsApp confirmations', value: true },
      { label: 'Human handoff', value: true },
      { label: 'Outbound campaigns', value: true },
      { label: 'Payment collection', value: true },
      { label: 'API / integrations', value: 'EHR/EMR + custom' },
      { label: 'Clinic locations', value: 'Unlimited' },
      { label: 'Support', value: 'Dedicated AM + SLA' },
    ],
    cta: 'Contact Sales',
    href: '/contact',
  },
]

const tableFeatures = [
  '24/7 AI answering',
  'Appointment booking',
  'Rescheduling & cancellation',
  'Waitlist management',
  'Multi-language support',
  'Human handoff',
  'Emergency escalation',
  'Outbound reminders',
  'Outbound campaigns',
  'Payment collection',
  'SMS confirmations',
  'WhatsApp integration',
  'Call analytics dashboard',
  'Monthly reports',
  'API access',
  'EHR/EMR integration',
  'Dedicated account manager',
  'Custom voice persona',
  'White-label option',
  'SLA guarantee',
]

const tableData: Record<string, [boolean | string, boolean | string, boolean | string]> = {
  '24/7 AI answering': [true, true, true],
  'Appointment booking': [true, true, true],
  'Rescheduling & cancellation': [true, true, true],
  'Waitlist management': [true, true, true],
  'Multi-language support': ['1 regional', 'All languages', 'All + custom'],
  'Human handoff': [false, true, true],
  'Emergency escalation': [false, true, true],
  'Outbound reminders': [false, true, true],
  'Outbound campaigns': [false, true, true],
  'Payment collection': [false, true, true],
  'SMS confirmations': [true, true, true],
  'WhatsApp integration': [false, true, true],
  'Call analytics dashboard': ['Basic', 'Advanced', 'Advanced'],
  'Monthly reports': [false, true, true],
  'API access': [false, 'REST API', 'Full API'],
  'EHR/EMR integration': [false, false, true],
  'Dedicated account manager': [false, false, true],
  'Custom voice persona': [false, false, true],
  'White-label option': [false, false, true],
  'SLA guarantee': [false, false, true],
}

function Cell({ val }: { val: boolean | string }) {
  if (val === true) return <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
  if (val === false) return <X className="w-4 h-4 text-[#c3cdc7] mx-auto" />
  return <span className="text-sm text-[#4b5d54] font-medium">{val}</span>
}

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-28 pb-16 bg-gradient-to-b from-[#f6faf8] to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Pricing</span>
          <h1 className="font-syne font-bold text-4xl sm:text-5xl text-[#0f1f17] mb-5">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-[#4b5d54] max-w-2xl mx-auto">
            No per-call surprises. No hidden fees. Pick a plan that matches your clinic&apos;s size and scale up anytime.
          </p>
          <p className="text-sm text-emerald-600 font-medium mt-4">
            All plans include a 14-day free trial — no credit card required
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {plans.map(({ icon: Icon, name, tagline, price, priceNote, highlight, features, cta, href }) => (
              <div
                key={name}
                className={`rounded-2xl p-7 border relative ${
                  highlight
                    ? 'bg-emerald-500 border-emerald-500 shadow-2xl shadow-emerald-500/20 scale-[1.02]'
                    : 'bg-white border-[#e4ebe7]'
                }`}
              >
                {highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${highlight ? 'bg-emerald-400' : 'bg-emerald-50'}`}>
                  <Icon className={`w-5 h-5 ${highlight ? 'text-white' : 'text-emerald-600'}`} />
                </div>
                <h2 className={`font-syne font-bold text-2xl mb-1 ${highlight ? 'text-white' : 'text-[#0f1f17]'}`}>{name}</h2>
                <p className={`text-sm mb-5 ${highlight ? 'text-emerald-100' : 'text-[#7a8d83]'}`}>{tagline}</p>
                <div className={`rounded-xl p-4 mb-6 ${highlight ? 'bg-emerald-400/40' : 'bg-[#f6faf8]'}`}>
                  <p className={`font-syne font-bold text-lg ${highlight ? 'text-white' : 'text-emerald-600'}`}>{price}</p>
                  <p className={`text-xs mt-0.5 ${highlight ? 'text-emerald-100' : 'text-[#7a8d83]'}`}>{priceNote}</p>
                </div>
                <ul className="space-y-2 mb-7">
                  {features.map((f) => (
                    <li key={f.label} className="flex items-center justify-between gap-2">
                      <span className={`text-xs ${highlight ? 'text-emerald-100' : 'text-[#4b5d54]'}`}>{f.label}</span>
                      {f.value === true ? (
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${highlight ? 'text-emerald-200' : 'text-emerald-500'}`} />
                      ) : f.value === false ? (
                        <X className={`w-3.5 h-3.5 flex-shrink-0 ${highlight ? 'text-emerald-300' : 'text-[#c3cdc7]'}`} />
                      ) : (
                        <span className={`text-xs font-semibold ${highlight ? 'text-white' : 'text-[#0f1f17]'}`}>{f.value}</span>
                      )}
                    </li>
                  ))}
                </ul>
                <Link
                  href={href}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-all ${
                    highlight ? 'bg-white text-emerald-700 hover:bg-emerald-50' : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison table */}
      <section className="py-16 bg-[#f6faf8]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-syne font-bold text-2xl sm:text-3xl text-[#0f1f17] text-center mb-8">Full feature comparison</h2>
          <div className="bg-white rounded-2xl border border-[#e4ebe7] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e4ebe7]">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-[#0f1f17] w-1/2">Feature</th>
                    {['Starter', 'Professional', 'Enterprise'].map((p) => (
                      <th key={p} className={`px-4 py-4 text-sm font-semibold text-center ${p === 'Professional' ? 'text-emerald-600' : 'text-[#0f1f17]'}`}>
                        {p}
                        {p === 'Professional' && <span className="block text-xs font-normal text-emerald-400">Most Popular</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableFeatures.map((f, i) => (
                    <tr key={f} className={`border-b border-[#e4ebe7] ${i % 2 === 0 ? '' : 'bg-[#f6faf8]'}`}>
                      <td className="px-6 py-3 text-sm text-[#4b5d54]">{f}</td>
                      {tableData[f].map((v, j) => (
                        <td key={j} className="px-4 py-3 text-center">
                          <Cell val={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-syne font-bold text-2xl text-[#0f1f17] text-center mb-8">Pricing FAQ</h2>
          <div className="space-y-4">
            {[
              { q: 'Is there a free trial?', a: 'Yes. All plans come with a 14-day free trial. No credit card required.' },
              { q: 'What happens if I exceed my call limit?', a: 'We will notify you when you reach 80% of your limit. You can upgrade your plan or purchase a call top-up. We never cut off service without warning.' },
              { q: 'Can I switch plans anytime?', a: 'Yes. You can upgrade or downgrade at any time. Changes take effect at the start of your next billing cycle.' },
              { q: 'Do you offer annual discounts?', a: 'Yes. Annual plans come with 20% off the monthly price. Contact us to set up an annual subscription.' },
            ].map((faq) => (
              <div key={faq.q} className="bg-[#f6faf8] rounded-xl p-5 border border-[#e4ebe7]">
                <p className="font-semibold text-[#0f1f17] mb-2">{faq.q}</p>
                <p className="text-sm text-[#4b5d54]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#f6faf8]">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="font-syne font-bold text-2xl text-[#0f1f17] mb-4">Not sure which plan is right for you?</h2>
          <p className="text-[#4b5d54] mb-6">Talk to our team. We will help you pick the perfect plan for your clinic&apos;s needs and volume.</p>
          <Link href="/request-demo" className="inline-flex items-center gap-2 px-7 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20">
            Book a Free Consultation <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  )
}
