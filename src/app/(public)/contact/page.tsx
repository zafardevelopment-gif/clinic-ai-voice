import type { Metadata } from 'next'
import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact MediVoice AI — Get a Free Demo for Your Clinic',
  description: 'Contact the MediVoice AI team to book a free 15-minute demo, ask about pricing, or get started with AI appointment booking for your clinic. We respond within 24 hours.',
  keywords: [
    'contact MediVoice AI',
    'book free clinic AI demo',
    'AI receptionist demo India',
    'MediVoice AI support',
    'clinic automation enquiry India',
  ],
  alternates: { canonical: 'https://medivoice.ai/contact' },
  openGraph: {
    title: 'Contact MediVoice AI — Free Demo for Your Clinic',
    description: 'Book a free 15-minute demo or ask us anything. We respond within 24 hours.',
    url: 'https://medivoice.ai/contact',
  },
}

export default function ContactPage() {
  return (
    <>
      <section className="pt-28 pb-16 bg-gradient-to-b from-[#f6faf8] to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Contact</span>
          <h1 className="font-syne font-bold text-4xl sm:text-5xl text-[#0f1f17] mb-5">
            We&apos;d love to hear from you
          </h1>
          <p className="text-xl text-[#4b5d54]">
            Questions about pricing, features, or getting set up? We respond within 24 hours.
          </p>
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            {/* Contact info */}
            <div className="space-y-6">
              <div>
                <h2 className="font-syne font-semibold text-xl text-[#0f1f17] mb-4">Get in touch</h2>
                <div className="space-y-4">
                  {[
                    { icon: Mail, label: 'Email', value: 'hello@medivoice.ai', href: 'mailto:hello@medivoice.ai' },
                    { icon: Phone, label: 'Phone', value: '+91 92042 98771', href: 'tel:+919204298771' },
                    { icon: MapPin, label: 'Address', value: 'Bengaluru, Karnataka, India', href: null },
                    { icon: Clock, label: 'Support Hours', value: 'Mon–Fri, 9am–6pm IST', href: null },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs text-[#7a8d83] mb-0.5">{label}</p>
                        {href ? (
                          <a href={href} className="text-sm font-medium text-[#0f1f17] hover:text-emerald-600 transition-colors">{value}</a>
                        ) : (
                          <p className="text-sm font-medium text-[#0f1f17]">{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-emerald-700">Sales Enquiries</p>
                </div>
                <p className="text-xs text-[#4b5d54] leading-relaxed">
                  For pricing, enterprise contracts, or custom integrations, email us at{' '}
                  <a href="mailto:sales@medivoice.ai" className="text-emerald-600 underline">sales@medivoice.ai</a>.
                </p>
              </div>
            </div>

            {/* Contact form */}
            <div className="lg:col-span-2 bg-[#f6faf8] rounded-2xl p-7 border border-[#e4ebe7]">
              <h2 className="font-syne font-semibold text-xl text-[#0f1f17] mb-6">Send us a message</h2>
              <form className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Dr. Priya Sharma"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] bg-white text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="you@clinic.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] bg-white text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] bg-white text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Clinic Type</label>
                    <select className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] bg-white text-sm text-[#0f1f17] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition">
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0f1f17] mb-1.5">Message *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Tell us about your clinic and what you're looking for..."
                    className="w-full px-4 py-2.5 rounded-xl border border-[#e4ebe7] bg-white text-sm text-[#0f1f17] placeholder-[#7a8d83] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Send Message
                </button>
                <p className="text-xs text-[#7a8d83] text-center">
                  We respond within 24 business hours. Your data is secure and never shared.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
