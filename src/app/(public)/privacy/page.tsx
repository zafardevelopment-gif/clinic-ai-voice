import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — MediVoice AI',
  description: 'MediVoice AI Privacy Policy. Learn how we collect, use, and protect your data and patient information.',
  alternates: { canonical: 'https://medivoice.ai/privacy' },
}

export default function PrivacyPage() {
  const updated = 'June 1, 2025'
  return (
    <section className="pt-28 pb-20 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Legal</span>
          <h1 className="font-syne font-bold text-4xl text-[#0f1f17] mb-3">Privacy Policy</h1>
          <p className="text-sm text-[#7a8d83]">Last updated: {updated}</p>
        </div>

        <div className="prose prose-sm max-w-none text-[#4b5d54] space-y-8">
          {[
            {
              title: '1. Introduction',
              content: `MediVoice AI ("we", "us", "our") is committed to protecting the privacy of our clients (clinics and hospitals) and their patients. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use our AI voice agent platform ("Service"). By using the Service, you agree to the collection and use of information in accordance with this policy.`,
            },
            {
              title: '2. Information We Collect',
              content: `We collect the following types of information:\n\n**Account Information:** When a clinic registers, we collect the name, email address, phone number, clinic name, and billing information of the authorized administrator.\n\n**Patient Communication Data:** Our AI records and transcribes phone calls between patients and the AI system. This includes caller phone numbers, call recordings (where permitted by local law), call transcripts, appointment details, and any information volunteered by the patient during the call.\n\n**Usage Data:** We collect data on how the Service is accessed and used, including log data, device information, and dashboard interaction data.\n\n**Payment Information:** Payment is processed through Razorpay. We do not store full credit card numbers on our servers.`,
            },
            {
              title: '3. How We Use Your Information',
              content: `We use collected information to:\n\n• Provide, operate, and maintain the Service\n• Process appointments, reminders, and patient communications on behalf of clinics\n• Improve and personalize the AI voice agent's accuracy and performance\n• Send transactional and administrative communications to clinic administrators\n• Comply with legal obligations and enforce our Terms of Service\n• Detect and prevent fraud or misuse\n\nWe do not sell, trade, or rent your personal information or patient data to third parties.`,
            },
            {
              title: '4. Data Storage & Security',
              content: `All data is stored on India-based servers. We implement industry-standard security measures including:\n\n• Encryption in transit (TLS 1.3)\n• Encryption at rest (AES-256)\n• Role-based access controls with audit logs\n• Regular security assessments\n• HIPAA-ready architecture for healthcare compliance\n\nWhile we implement safeguards, no system is 100% secure. We encourage clinics to use strong passwords and restrict dashboard access to authorized personnel.`,
            },
            {
              title: '5. Patient Data',
              content: `MediVoice AI processes patient data as a data processor on behalf of clinics (who are the data controllers). Clinics are responsible for obtaining appropriate patient consent for AI-mediated communications as required by applicable law. We will process patient data only as instructed by the clinic and as described in this policy. We sign Data Processing Agreements (DPAs) with Enterprise clients.`,
            },
            {
              title: '6. Data Retention',
              content: `Call recordings are retained for 90 days by default (configurable per clinic). Appointment and patient records are retained for the duration of the client's subscription. On account termination, all data is permanently deleted within 30 days. Clients may request an export of their data at any time.`,
            },
            {
              title: '7. Third-Party Services',
              content: `We use the following third-party services in delivering the Service:\n\n• Supabase (database hosting)\n• Twilio / Exotel (telephony)\n• Razorpay (payment processing)\n• Sarvam AI (Indian language speech processing)\n• OpenRouter (AI language models)\n\nEach service is governed by its own privacy policy. We ensure data sharing agreements are in place for all sub-processors.`,
            },
            {
              title: '8. Your Rights',
              content: `Clinic administrators have the right to:\n\n• Access all data stored about their clinic and patients\n• Correct inaccurate data\n• Delete data at any time from the dashboard\n• Export data in standard formats\n• Opt out of non-essential communications\n\nTo exercise these rights, contact us at privacy@medivoice.ai.`,
            },
            {
              title: '9. Changes to This Policy',
              content: `We may update this Privacy Policy from time to time. We will notify clinic administrators of material changes via email at least 14 days before the changes take effect. Continued use of the Service after the effective date constitutes acceptance of the updated policy.`,
            },
            {
              title: '10. Contact Us',
              content: `For privacy-related questions, data requests, or to report a concern:\n\nEmail: privacy@medivoice.ai\nAddress: MediVoice AI, Bengaluru, Karnataka, India`,
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
