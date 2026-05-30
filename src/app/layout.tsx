import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClinicAI — AI Voice Agent Platform',
  description: 'Intelligent AI Voice Agent for Healthcare Clinics',
}

// Required for proper mobile rendering (no desktop-zoom on phones).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
