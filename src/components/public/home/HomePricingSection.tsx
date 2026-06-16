import Link from 'next/link'
import { CheckCircle2, ArrowRight, Zap, Building, Building2 } from 'lucide-react'

const plans = [
  {
    icon: Zap,
    name: 'Starter',
    tagline: 'Perfect for solo practitioners',
    price: '₹2,999',
    priceNote: 'per month · 14-day free trial',
    highlight: false,
    features: [
      'Up to 500 AI calls/month',
      'Appointment booking & rescheduling',
      'English + 1 regional language',
      'Basic call analytics',
      'Email support',
      '1 clinic location',
    ],
    cta: 'Start Free Trial',
    href: '/request-demo',
  },
  {
    icon: Building,
    name: 'Professional',
    tagline: 'For growing clinics',
    price: 'Most Popular',
    priceNote: 'Contact for pricing',
    highlight: true,
    features: [
      'Up to 2,000 AI calls/month',
      'All Starter features',
      'All Indian languages',
      'Advanced analytics dashboard',
      'Outbound reminder calls',
      'Human handoff & escalation',
      'WhatsApp & SMS integration',
      'Priority support',
      'Up to 3 clinic locations',
    ],
    cta: 'Get Started',
    href: '/request-demo',
  },
  {
    icon: Building2,
    name: 'Enterprise',
    tagline: 'For hospital groups & chains',
    price: 'Custom',
    priceNote: 'tailored pricing',
    highlight: false,
    features: [
      'Unlimited AI calls',
      'All Professional features',
      'Custom voice & persona',
      'EHR/EMR integration',
      'Dedicated account manager',
      'Custom AI training',
      'SLA guarantee',
      'Unlimited clinic locations',
      'White-label option',
    ],
    cta: 'Contact Sales',
    href: '/contact',
  },
]

export default function HomePricingSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Pricing</span>
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-[#0f1f17] mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-[#4b5d54] max-w-2xl mx-auto">
            No hidden fees. No per-call surprises. Choose the plan that fits your clinic&apos;s size.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map(({ icon: Icon, name, tagline, price, priceNote, highlight, features, cta, href }) => (
            <div
              key={name}
              className={`rounded-2xl p-7 border transition-all relative ${
                highlight
                  ? 'bg-emerald-500 border-emerald-500 shadow-2xl shadow-emerald-500/20 scale-[1.02]'
                  : 'bg-white border-[#e4ebe7] hover:shadow-md'
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

              <h3 className={`font-syne font-bold text-xl mb-1 ${highlight ? 'text-white' : 'text-[#0f1f17]'}`}>{name}</h3>
              <p className={`text-sm mb-4 ${highlight ? 'text-emerald-100' : 'text-[#7a8d83]'}`}>{tagline}</p>

              <div className={`rounded-xl p-4 mb-6 ${highlight ? 'bg-emerald-400/40' : 'bg-[#f6faf8]'}`}>
                <p className={`font-syne font-bold text-lg ${highlight ? 'text-white' : 'text-emerald-600'}`}>{price}</p>
                <p className={`text-xs mt-0.5 ${highlight ? 'text-emerald-100' : 'text-[#7a8d83]'}`}>{priceNote}</p>
              </div>

              <ul className="space-y-2.5 mb-7">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 mt-0.5 ${highlight ? 'text-emerald-200' : 'text-emerald-500'}`} />
                    <span className={`text-sm ${highlight ? 'text-emerald-50' : 'text-[#4b5d54]'}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={href}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-all ${
                  highlight
                    ? 'bg-white text-emerald-700 hover:bg-emerald-50'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                {cta}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[#7a8d83] mt-8">
          All plans include a 14-day free trial. No credit card required.{' '}
          <Link href="/pricing" className="text-emerald-600 hover:underline">
            Compare all features →
          </Link>
        </p>
      </div>
    </section>
  )
}
