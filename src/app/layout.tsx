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
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
