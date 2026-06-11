'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ArrowRight } from 'lucide-react'

const faqs = [
  {
    q: 'How does AI appointment booking work?',
    a: 'When a patient calls your clinic number, MediVoice AI answers immediately. It understands the patient\'s intent using natural language processing, checks doctor availability in real time, and books the appointment — all in a natural conversation in the patient\'s preferred language. The booking is instantly reflected in your clinic dashboard.',
  },
  {
    q: 'Can the AI transfer calls to my staff?',
    a: 'Yes. MediVoice AI has built-in human handoff capability. If a patient asks to speak to a doctor, has a complex query, or triggers an emergency escalation keyword, the AI seamlessly transfers the call to the appropriate staff member. Your team can also configure which scenarios trigger a handoff.',
  },
  {
    q: 'Does it support multiple languages?',
    a: 'Absolutely. MediVoice AI supports Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, and Punjabi. The AI automatically detects the patient\'s language and responds accordingly — no configuration needed for each call.',
  },
  {
    q: 'Can it integrate with our clinic management software?',
    a: 'MediVoice AI offers API integrations with popular clinic management systems (HMS/EMR). Our Enterprise plan includes custom EHR/EMR integration. For clinics without existing software, MediVoice provides its own complete appointment and patient management dashboard.',
  },
  {
    q: 'Is patient data secure?',
    a: 'Yes. MediVoice AI is built with HIPAA-ready architecture — all patient data is encrypted in transit and at rest. We follow strict data residency practices (India-based servers), and access is role-based with full audit logs. We sign Data Processing Agreements (DPAs) with all Enterprise clients.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most clinics are live within 48 hours. Our onboarding team handles everything — phone number configuration, voice persona setup, doctor schedules, FAQs, and more. You do not need any technical skills.',
  },
]

export default function HomeFaqSection() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="py-20 lg:py-28 bg-[#f6faf8]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">FAQ</span>
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-[#0f1f17] mb-4">
            Common questions
          </h2>
          <p className="text-lg text-[#4b5d54]">
            Everything you need to know about MediVoice AI.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-[#e4ebe7] overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-semibold text-[#0f1f17] pr-4">{faq.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-[#7a8d83] flex-shrink-0 transition-transform ${
                    open === i ? 'rotate-180 text-emerald-500' : ''
                  }`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="text-[#4b5d54] text-sm leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link href="/faq" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
            See all FAQs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
