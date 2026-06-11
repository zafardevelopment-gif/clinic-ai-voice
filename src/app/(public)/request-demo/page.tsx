import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2, Phone, Clock, Users, Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Request a Demo — MediVoice AI',
  description:
    'Book a free 30-minute demo of MediVoice AI. See how the AI voice receptionist works live for your clinic. No credit card required.',
  alternates: { canonical: 'https://medivoice.ai/request-demo' },
}

const benefits = [
  'Live demo of the AI booking a real appointment',
  'Personalised walkthrough for your clinic type',
  'Pricing and plan recommendation',
  'Q&A with our healthcare AI specialists',
  'Setup timeline and integration assessment',
]

export default function RequestDemoPage() {
  return (
    <section className="pt-28 pb-20 bg-gradient-to-b from-[#f6faf8] to-white min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left: Info */}
          <div>
            <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Free Demo</span>
            <h1 className="font-syne font-bold text-4xl sm:text-5xl text-[#0f1f17] mb-5">
              See MediVoice AI in action — live
            </h1>
            <p className="text-lg text-[#4b5d54] mb-8 leading-relaxed">
              Book a 30-minute personalised demo and watch our AI handle a real patient call for your clinic type.
              No slides. No jargon. Just live product.
            </p>

            <div className="space-y-3 mb-8">
              {benefits.map((b) => (
                <div key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-[#4b5d54]">{b}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { icon: Clock, label: 'Duration', value: '30 minutes' },
                { icon: Users, label: 'Format', value: 'Video call / in-person' },
                { icon: Calendar, label: 'Availability', value: 'Mon–Sat, 9am–7pm IST' },
                { icon: Phone, label: 'Follow-up', value: 'Full trial access' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-[#e4ebe7]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-[#7a8d83]">{label}</p>
                    <p className="text-sm font-semibold text-[#0f1f17]">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
              <p className="text-sm text-emerald-800 font-semibold mb-1">No pressure. No commitment.</p>
              <p className="text-sm text-emerald-700">
                The demo is completely free. If MediVoice is not a fit for your clinic, we will tell you honestly.
                We only want clients who get real value from the product.
              </p>
            </div>
          </div>

          {/* Right: Form */}
          <div className="bg-white rounded-2xl border border-[#e4ebe7] shadow-sm p-8">
            <h2 className="font-syne font-semibold text-xl text-[#0f1f17] mb-6">Book your free demo</h2>
            <form className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">First Name *</label>
                  <input type="text" required placeholder="Priya" className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Last Name *</label>
                  <input type="text" required placeholder="Sharma" className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Work Email *</label>
                <input type="email" required placeholder="you@clinic.com" className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Phone Number *</label>
                <input type="tel" required placeholder="+91 98765 43210" className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Clinic / Hospital Name *</label>
                <input type="text" required placeholder="Sunrise Dental Clinic" className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Clinic Type</label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition bg-white">
                    <option value="">Select type</option>
                    <option>Dental Clinic</option>
                    <option>General Practice</option>
                    <option>Specialist Centre</option>
                    <option>Hospital</option>
                    <option>Clinic Chain</option>
                    <option>Diagnostic Centre</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Monthly Calls (approx.)</label>
                  <select className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition bg-white">
                    <option value="">Select range</option>
                    <option>Less than 200</option>
                    <option>200 – 500</option>
                    <option>500 – 2,000</option>
                    <option>More than 2,000</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Anything specific you want to see?</label>
                <textarea rows={3} placeholder="e.g. How does the Hindi booking flow work? Can it handle multi-doctor scheduling?" className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition resize-none" />
              </div>
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
              >
                Book My Free Demo →
              </button>
              <p className="text-xs text-[#7a8d83] text-center">
                By submitting, you agree to our{' '}
                <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>.
                We will contact you within 4 business hours to confirm your demo slot.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
