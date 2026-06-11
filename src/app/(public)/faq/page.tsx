import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import CtaSection from '@/components/public/home/CtaSection'

export const metadata: Metadata = {
  title: 'FAQ — MediVoice AI',
  description:
    'Frequently asked questions about MediVoice AI — how it works, pricing, language support, data security, integrations, and setup process for clinics and hospitals.',
  alternates: { canonical: 'https://medivoice.ai/faq' },
}

const faqCategories = [
  {
    title: 'How It Works',
    faqs: [
      {
        q: 'How does AI appointment booking work?',
        a: 'When a patient calls your clinic\'s phone number, MediVoice AI answers immediately. It identifies the patient\'s intent through natural language understanding, checks doctor availability in real time from your clinic\'s schedule, and confirms the booking — all in a natural conversation. The appointment is instantly logged in your dashboard and a confirmation SMS is sent to the patient.',
      },
      {
        q: 'What happens during peak hours when call volume is high?',
        a: 'Unlike human receptionists, MediVoice AI handles unlimited concurrent calls. Every patient is answered instantly regardless of how many calls come in simultaneously. There are no hold queues, no busy signals.',
      },
      {
        q: 'Can the AI understand different accents and dialects?',
        a: 'Yes. Our AI is trained on a diverse range of Indian accents and speaking styles. It handles regional variations within Hindi, Tamil, Telugu, and other supported languages. The model is continuously improved based on real clinic call data.',
      },
      {
        q: 'What happens if the AI cannot understand a patient?',
        a: 'If the AI cannot confidently understand a patient after two attempts, it gracefully transfers the call to your clinic staff with full context about what the patient was trying to accomplish.',
      },
    ],
  },
  {
    title: 'Call Handling & Features',
    faqs: [
      {
        q: 'Can the AI transfer calls to my staff?',
        a: 'Yes. Human handoff is a core feature. You can configure rules for when the AI transfers calls — for example, when a patient explicitly asks for a doctor, when an emergency keyword is detected, or for any query type you prefer to handle manually. Transfers are warm (with context), not cold drops.',
      },
      {
        q: 'Does it support multiple languages?',
        a: 'MediVoice AI currently supports Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, and Punjabi. The AI automatically detects the language the patient speaks and responds accordingly. Language support can be expanded on Enterprise plans.',
      },
      {
        q: 'Can it handle outbound calls — reminders, follow-ups?',
        a: 'Yes. The Professional and Enterprise plans include outbound reminder calls. The AI calls patients before their appointment to confirm attendance, reschedule if needed, and offer to waitlisted patients when a slot opens. Outbound campaign calls (health tips, annual check-up reminders) are also available.',
      },
      {
        q: 'What types of queries can the AI handle beyond booking?',
        a: 'MediVoice AI can handle: appointment booking, rescheduling, cancellation, doctor availability queries, clinic timings and location, service and fee inquiries, prescription refill requests, test result status, emergency escalation, payment collection, and family bookings. You can also add custom FAQs specific to your clinic.',
      },
    ],
  },
  {
    title: 'Integrations & Technical',
    faqs: [
      {
        q: 'Can it integrate with our clinic management software?',
        a: 'MediVoice AI integrates with popular HMS/EMR systems via REST API (Professional plan and above). Custom EHR/EMR integrations are available on the Enterprise plan. For clinics without existing software, MediVoice provides a complete clinic management dashboard built in.',
      },
      {
        q: 'Do we need to change our phone number?',
        a: 'No. MediVoice AI works with your existing clinic phone number. We configure call forwarding so calls route to our AI, and you keep your number. We support Twilio and Exotel telephony providers, covering virtually all Indian numbers.',
      },
      {
        q: 'What telephony providers do you support?',
        a: 'We support Twilio (global) and Exotel (India-native). Exotel is recommended for Indian clinics as it provides better call quality and local number support. We handle the telephony setup as part of onboarding.',
      },
      {
        q: 'Does MediVoice work on mobile and tablet?',
        a: 'The MediVoice clinic dashboard is fully responsive and works on desktop, tablet, and mobile browsers. Your receptionist or clinic administrator can access the dashboard, view call logs, and manage appointments from any device.',
      },
    ],
  },
  {
    title: 'Security & Privacy',
    faqs: [
      {
        q: 'Is patient data secure?',
        a: 'Yes. MediVoice AI is built with HIPAA-ready architecture. All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We use India-based servers for data residency. Access is role-based with full audit logs. We sign Data Processing Agreements (DPAs) with all clients.',
      },
      {
        q: 'Who has access to patient call data?',
        a: 'Only authorized users at your clinic can access call data through the dashboard. MediVoice staff access is strictly controlled and logged. We never use your patient data for training models on other clients. Full data isolation is guaranteed.',
      },
      {
        q: 'Can we delete patient data?',
        a: 'Yes. You can delete any patient record or call log from your dashboard at any time. On account closure, all data is permanently purged within 30 days. We can provide a data export before deletion.',
      },
    ],
  },
  {
    title: 'Setup & Pricing',
    faqs: [
      {
        q: 'How long does setup take?',
        a: 'Most clinics are fully live within 48 hours of signing up. Our onboarding team handles phone number configuration, voice persona setup, doctor schedules, FAQ library, and dashboard access. No technical skills required from your side.',
      },
      {
        q: 'Is there a free trial?',
        a: 'Yes. All plans come with a 14-day free trial. No credit card required. You can experience the full product before committing.',
      },
      {
        q: 'What are the pricing plans?',
        a: 'We offer three plans: Starter (up to 500 calls/month, 1 clinic), Professional (up to 2,000 calls/month, up to 3 clinics, all languages), and Enterprise (unlimited calls, unlimited clinics, custom integrations). All plans include a 14-day trial. Contact us for exact pricing.',
      },
      {
        q: 'Do you offer annual discounts?',
        a: 'Yes. Annual subscriptions come with 20% off the monthly price. Contact our sales team at sales@medivoice.ai to set up an annual plan.',
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <>
      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqCategories.flatMap((cat) =>
              cat.faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.q,
                acceptedAnswer: { '@type': 'Answer', text: faq.a },
              }))
            ),
          }),
        }}
      />

      <section className="pt-28 pb-16 bg-gradient-to-b from-[#f6faf8] to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">FAQ</span>
          <h1 className="font-syne font-bold text-4xl sm:text-5xl text-[#0f1f17] mb-5">
            Frequently asked questions
          </h1>
          <p className="text-xl text-[#4b5d54]">
            Everything you need to know about MediVoice AI. Can&apos;t find your answer?{' '}
            <Link href="/contact" className="text-emerald-600 underline underline-offset-2">Contact us.</Link>
          </p>
        </div>
      </section>

      <section className="pb-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {faqCategories.map((cat) => (
            <div key={cat.title} className="mb-12">
              <h2 className="font-syne font-bold text-xl text-[#0f1f17] mb-5 pb-3 border-b border-[#e4ebe7]">
                {cat.title}
              </h2>
              <div className="space-y-4">
                {cat.faqs.map((faq) => (
                  <details key={faq.q} className="group bg-[#f6faf8] rounded-2xl border border-[#e4ebe7] overflow-hidden">
                    <summary className="px-6 py-5 font-semibold text-[#0f1f17] cursor-pointer list-none flex items-center justify-between hover:bg-emerald-50/50 transition-colors">
                      {faq.q}
                      <ArrowRight className="w-4 h-4 text-[#7a8d83] flex-shrink-0 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-6 pb-5">
                      <p className="text-sm text-[#4b5d54] leading-relaxed">{faq.a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <CtaSection />
    </>
  )
}
