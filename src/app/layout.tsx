import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://medivoice.ai'),
  title: {
    default: 'MediVoice AI — AI Voice Agent for Clinics & Hospitals',
    template: '%s | MediVoice AI',
  },
  description:
    'MediVoice AI is a 24/7 multilingual AI voice receptionist that automates appointment booking, patient queries, reminders, and clinic communication. Trusted by clinics and hospitals across India.',
  keywords: [
    'AI receptionist for clinics',
    'AI appointment booking software',
    'healthcare voice agent',
    'clinic call automation',
    'medical appointment scheduling software',
    'AI voice assistant for hospitals',
    'automated clinic receptionist',
    'voice AI healthcare India',
    'clinic management software',
    'patient communication automation',
  ],
  authors: [{ name: 'MediVoice AI' }],
  creator: 'MediVoice AI',
  publisher: 'MediVoice AI',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://medivoice.ai',
    siteName: 'MediVoice AI',
    title: 'MediVoice AI — AI Voice Agent for Clinics & Hospitals',
    description:
      '24/7 multilingual AI voice receptionist. Automate appointment booking, patient queries, and clinic communication.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MediVoice AI Dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediVoice AI — AI Voice Agent for Clinics & Hospitals',
    description:
      '24/7 multilingual AI voice receptionist. Automate appointment booking, patient queries, and clinic communication.',
    images: ['/og-image.png'],
    creator: '@medivoiceai',
  },
  alternates: { canonical: 'https://medivoice.ai' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10b981',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2310b981'/%3E%3Crect x='12' y='4' width='8' height='14' rx='4' fill='white'/%3E%3Cpath d='M7 15a9 9 0 0 0 18 0' stroke='white' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cline x1='16' y1='24' x2='16' y2='28' stroke='white' stroke-width='2.5' stroke-linecap='round'/%3E%3Cline x1='11' y1='28' x2='21' y2='28' stroke='white' stroke-width='2.5' stroke-linecap='round'/%3E%3C/svg%3E" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
