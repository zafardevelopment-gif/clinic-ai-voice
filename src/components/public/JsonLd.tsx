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
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'sales',
            email: 'hello@medivoice.ai',
            availableLanguage: ['English', 'Hindi'],
          },
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
            'AI voice receptionist for clinics and hospitals. Automates appointment booking, patient queries, reminders, and clinic communication.',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'INR',
            offerCount: 3,
            lowPrice: 'Contact for pricing',
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            reviewCount: '47',
          },
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
