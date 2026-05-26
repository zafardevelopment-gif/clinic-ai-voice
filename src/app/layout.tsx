import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ClinicAI — AI Voice Agent Platform',
  description: 'Intelligent AI Voice Agent for Healthcare Clinics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
