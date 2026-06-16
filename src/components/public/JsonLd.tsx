export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'MediVoice AI',
          url: 'https://medivoice.ai',
          logo: 'https://medivoice.ai/logo.png',
          description:
            'MediVoice AI is a 24/7 multilingual AI voice receptionist for Indian clinics and hospitals.',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Bengaluru',
            addressRegion: 'Karnataka',
            addressCountry: 'IN',
          },
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'sales',
              email: 'hello@medivoice.ai',
              telephone: '+91-92042-98771',
              availableLanguage: ['English', 'Hindi'],
            },
            {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              email: 'hello@medivoice.ai',
              telephone: '+91-92042-98771',
            },
          ],
          sameAs: [
            'https://twitter.com/medivoiceai',
            'https://linkedin.com/company/medivoiceai',
          ],
        }),
      }}
    />
  )
}

export function SoftwareApplicationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'MediVoice AI',
          applicationCategory: 'HealthApplication',
          operatingSystem: 'Web',
          description:
            'AI voice receptionist for Indian clinics and hospitals. Automates appointment booking, patient queries, reminders, and clinic communication in Hindi, English, Tamil, Telugu and 6 more languages.',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            offerCount: 3,
            lowPrice: '2999',
            highPrice: '99999',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '50',
            bestRating: '5',
            worstRating: '1',
          },
        }),
      }}
    />
  )
}

/** LocalBusiness schema — helps Google show rich results for branded searches */
export function LocalBusinessJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'MediVoice AI',
          image: 'https://medivoice.ai/og-image.png',
          url: 'https://medivoice.ai',
          telephone: '+91-92042-98771',
          email: 'hello@medivoice.ai',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Bengaluru',
            addressLocality: 'Bengaluru',
            addressRegion: 'Karnataka',
            postalCode: '560001',
            addressCountry: 'IN',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 12.9716,
            longitude: 77.5946,
          },
          openingHoursSpecification: {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            opens: '09:00',
            closes: '21:00',
          },
          priceRange: '₹₹',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '50',
          },
        }),
      }}
    />
  )
}

/** FAQPage schema — enables FAQ rich snippets in Google Search */
export function FaqPageJsonLd() {
  const faqs = [
    {
      q: 'How does AI appointment booking work?',
      a: 'When a patient calls your clinic number, MediVoice AI answers immediately. It understands the patient\'s intent, checks doctor availability in real time, and books the appointment — all in a natural conversation in the patient\'s preferred language.',
    },
    {
      q: 'Can the AI transfer calls to my staff?',
      a: 'Yes. MediVoice AI has built-in human handoff. If a patient asks to speak to a doctor or has a complex query, the AI seamlessly transfers the call to the appropriate staff member with full context.',
    },
    {
      q: 'Does MediVoice AI support multiple languages?',
      a: 'Yes. MediVoice AI supports Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, and Punjabi. The AI automatically detects the language and responds accordingly.',
    },
    {
      q: 'Can it integrate with our clinic management software?',
      a: 'MediVoice AI offers API integrations with popular clinic management systems (HMS/EMR). The Enterprise plan includes custom EHR/EMR integration. Clinics without existing software can use MediVoice\'s own dashboard.',
    },
    {
      q: 'Is patient data secure?',
      a: 'Yes. MediVoice AI is built with HIPAA-ready architecture. All patient data is encrypted in transit and at rest, stored on India-based servers with role-based access and full audit logs.',
    },
    {
      q: 'How long does setup take?',
      a: 'Most clinics are live within 48 hours. Our onboarding team handles everything — phone number setup, voice persona, doctor schedules, FAQs. No technical skills needed.',
    },
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map(({ q, a }) => ({
            '@type': 'Question',
            name: q,
            acceptedAnswer: { '@type': 'Answer', text: a },
          })),
        }),
      }}
    />
  )
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: item.name,
            item: item.url,
          })),
        }),
      }}
    />
  )
}
