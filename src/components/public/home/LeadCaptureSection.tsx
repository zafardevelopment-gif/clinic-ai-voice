'use client'

import { useState } from 'react'
import { Phone, MessageCircle, CheckCircle2 } from 'lucide-react'

const ROLES = [
  'Clinic Owner / Doctor',
  'Hospital Administrator',
  'Clinic Manager',
  'Diagnostic Centre Owner',
  'Healthcare Investor / Advisor',
  'Other',
]

const WHATSAPP_NUMBER = '919204298771'

export default function LeadCaptureSection() {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function saveToDb() {
    const res = await fetch('/api/contact-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mobile, role }),
    })
    if (!res.ok) throw new Error('Failed to save')
  }

  async function handleCallback(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !mobile.trim()) {
      setError('Please enter your name and mobile number.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await saveToDb()
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleWhatsApp(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !mobile.trim()) {
      setError('Please enter your name and mobile number.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await saveToDb()
    } catch {
      // still open WA even if db fails
    } finally {
      setLoading(false)
    }
    const msg = encodeURIComponent(
      `Hi! I'm ${name}${role ? ` (${role})` : ''}. My number is ${mobile}. I'd like a free demo of MediVoice AI for my clinic.`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`, '_blank')
    setSubmitted(true)
  }

  return (
    <section className="py-16 lg:py-20 bg-[#0f1f17]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          {submitted ? (
            /* ── Success state ── */
            <div className="bg-white rounded-3xl p-10 text-center shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="font-syne font-bold text-2xl text-[#0f1f17] mb-2">
                We&apos;ll be in touch soon!
              </h3>
              <p className="text-[#4b5d54]">
                Our team will call you within a few hours. You can also reach us directly on WhatsApp.
              </p>
            </div>
          ) : (
            /* ── Form ── */
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <div className="text-center mb-6">
                <span className="text-2xl mb-2 block">🤔</span>
                <h2 className="font-syne font-bold text-2xl text-[#0f1f17]">
                  Not sure which plan fits?
                </h2>
                <p className="text-[#4b5d54] text-sm mt-1">
                  Leave your number — get a free callback or an instant demo on WhatsApp.
                </p>
              </div>

              <form onSubmit={handleCallback} className="space-y-3">
                {/* Name + Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#9aada5] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-[#e4ebe7] text-sm text-[#0f1f17] placeholder-[#9aada5] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                    required
                  />
                </div>

                {/* Role dropdown */}
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[#e4ebe7] text-sm text-[#4b5d54] focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white appearance-none"
                >
                  <option value="">I am a...</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                {/* Error */}
                {error && <p className="text-red-500 text-xs">{error}</p>}

                {/* CTAs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    <Phone className="w-4 h-4" />
                    Get a Callback
                  </button>
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] hover:bg-[#20b958] text-white text-sm font-semibold transition-colors disabled:opacity-60"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Demo on WhatsApp
                  </button>
                </div>

                <p className="text-center text-xs text-[#9aada5] pt-1">
                  No spam — we only call about your query.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
