import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — MediVoice AI',
  description: 'MediVoice AI Terms of Service. Read the terms and conditions governing use of our AI voice agent platform for clinics and hospitals.',
  alternates: { canonical: 'https://medivoice.ai/terms' },
}

export default function TermsPage() {
  const updated = 'June 1, 2025'
  return (
    <section className="pt-28 pb-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Legal</span>
          <h1 className="font-syne font-bold text-4xl text-[#0f1f17] mb-3">Terms of Service</h1>
          <p className="text-sm text-[#7a8d83]">Last updated: {updated}</p>
        </div>

        <div className="space-y-8 text-[#4b5d54]">
          {[
            {
              title: '1. Acceptance of Terms',
              content: `By accessing or using MediVoice AI ("Service"), you agree to be bound by these Terms of Service. If you are using the Service on behalf of a clinic or organisation, you represent that you have the authority to bind that entity to these terms. If you do not agree to these terms, do not use the Service.`,
            },
            {
              title: '2. Description of Service',
              content: `MediVoice AI provides an AI-powered voice agent platform for healthcare clinics and hospitals. The Service includes AI call handling, appointment booking automation, patient communication tools, reminder calls, analytics dashboards, and related features as described on our website. Features vary by subscription plan.`,
            },
            {
              title: '3. Account Registration',
              content: `To use the Service, you must create an account with accurate information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately at support@medivoice.ai if you suspect unauthorized use of your account.`,
            },
            {
              title: '4. Acceptable Use',
              content: `You agree to use the Service only for lawful purposes in connection with legitimate healthcare operations. You must not:\n\n• Use the Service to conduct or facilitate illegal activities\n• Transmit patient data without proper consent where required by law\n• Attempt to reverse-engineer, copy, or resell the Service\n• Use the Service to harass or harm patients or third parties\n• Overload or interfere with the Service's infrastructure\n\nWe reserve the right to suspend accounts that violate these terms.`,
            },
            {
              title: '5. Subscriptions & Billing',
              content: `The Service is provided on a subscription basis. Fees are billed monthly or annually in advance as per your selected plan. All fees are in Indian Rupees (INR) unless otherwise stated. Subscription fees are non-refundable except where required by applicable law. We reserve the right to modify pricing with 30 days' notice. Continued use after the effective date constitutes acceptance of new pricing.`,
            },
            {
              title: '6. Free Trial',
              content: `New clients receive a 14-day free trial. No credit card is required for the trial. At the end of the trial, you must select a paid plan to continue using the Service. Trial data (call logs, appointments) is retained for 7 days after trial expiration.`,
            },
            {
              title: '7. Healthcare Compliance',
              content: `Clinics using the Service are responsible for ensuring their use complies with applicable healthcare regulations, including patient consent requirements for AI-mediated communications under applicable Indian law. MediVoice AI provides HIPAA-ready architecture and technical safeguards but does not constitute legal compliance advice. Clients should consult their legal counsel regarding specific compliance obligations.`,
            },
            {
              title: '8. Data Ownership',
              content: `You retain full ownership of your clinic data and patient data stored in the Service. By using the Service, you grant MediVoice AI a limited license to process this data solely to provide the Service. We do not claim ownership of your data and will not use it for any purpose other than providing and improving the Service for your account.`,
            },
            {
              title: '9. Service Availability',
              content: `We target 99.9% uptime for the Service. Planned maintenance will be communicated with at least 24 hours' notice. We are not liable for downtime caused by factors outside our reasonable control, including but not limited to telecommunications failures, third-party service outages, or force majeure events.`,
            },
            {
              title: '10. Limitation of Liability',
              content: `MediVoice AI shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use the Service. Our maximum aggregate liability for any claim is limited to the total fees paid by you in the three months preceding the claim. We are not liable for clinical decisions made based on data processed through the Service.`,
            },
            {
              title: '11. Termination',
              content: `You may cancel your subscription at any time through the dashboard or by contacting support@medivoice.ai. Cancellation takes effect at the end of the current billing period. We may terminate or suspend your account for material breach of these terms, with or without notice depending on the severity. On termination, your data will be retained for 30 days and then permanently deleted.`,
            },
            {
              title: '12. Governing Law',
              content: `These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka, India.`,
            },
            {
              title: '13. Contact',
              content: `For questions about these Terms:\n\nEmail: legal@medivoice.ai\nAddress: MediVoice AI, Bengaluru, Karnataka, India`,
            },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="font-syne font-semibold text-lg text-[#0f1f17] mb-3">{section.title}</h2>
              <div className="space-y-2">
                {section.content.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed whitespace-pre-line">{para}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
