'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * ASHA worker signup — UI ONLY, not wired to any backend yet.
 *
 * Deliberately not calling any API: ASHA authentication (session handling,
 * password hashing, the actual signup endpoint) is intentionally deferred
 * to a later pass covering auth for all roles together. This page exists so
 * the form/fields/flow can be reviewed and tested visually first. The
 * fields match asha_profiles (full_name, phone, region) + a clinic code
 * field for the optional linked_clinic_id (see migration 0011) plus
 * email/password placeholders for whatever auth mechanism lands later.
 *
 * Submit is a no-op stub — see handleSubmit below.
 */
export default function AshaSignupPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [clinicCode, setClinicCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: wire to a real ASHA signup endpoint once ASHA auth is built.
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <div className="pointer-events-none absolute" style={{
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
        top: -100, left: '50%', transform: 'translateX(-50%)',
      }} />
      <div className="pointer-events-none absolute" style={{
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        bottom: -80, right: -80,
      }} />

      <div className="relative z-10 w-full max-w-[440px] px-4 animate-fadeUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--acc), #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.30)' }}>
            🤝
          </div>
          <h1 className="font-syne text-2xl font-bold tracking-tight" style={{ color: 'var(--txt)' }}>ClinicAI</h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: 'var(--txt2)' }}>ASHA WORKER REGISTRATION</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: 'var(--s2)', border: '1px solid var(--b1)', boxShadow: '0 8px 40px rgba(0,0,0,0.55)' }}>
          <h2 className="font-syne text-lg font-bold mb-1" style={{ color: 'var(--txt)' }}>Register as an ASHA Worker</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--txt2)' }}>
            You&apos;ll be able to register patients and run AI-assisted voice consultations on their behalf.
          </p>

          {submitted ? (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--acc-dim)', color: 'var(--acc)', border: '1px solid rgba(16,185,129,0.2)' }}>
              Registration isn&apos;t live yet — ASHA sign-in is coming soon. Your details weren&apos;t saved.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full name" required>
                <input
                  type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Sunita Devi" required
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              <Field label="Phone">
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              <Field label="Region" hint="Village / block / district">
                <input
                  type="text" value={region} onChange={e => setRegion(e.target.value)}
                  placeholder="e.g. Barmer, Rajasthan"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              <Field label="Clinic / program code" hint="Optional — link to a specific clinic or government program">
                <input
                  type="text" value={clinicCode} onChange={e => setClinicCode(e.target.value)}
                  placeholder="Leave blank if not applicable"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              <Field label="Email" required>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              <Field label="Password" required>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="new-password"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
              </Field>

              <button
                type="submit"
                className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-all mt-2"
                style={{ background: 'var(--acc)', boxShadow: '0 4px 16px var(--acc-dim)', cursor: 'pointer' }}
              >
                Create Account
              </button>
            </form>
          )}

          <p className="text-center text-xs mt-5" style={{ color: 'var(--txt3)' }}>
            Already registered?{' '}
            <Link href="/asha/login" style={{ color: 'var(--acc)', fontWeight: 600 }}>Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--txt2)' }}>
        {label} {required && <span style={{ color: 'var(--rose)' }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: 'var(--txt3)' }}>{hint}</p>}
    </div>
  )
}

function focusStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--acc)'
  e.target.style.boxShadow = '0 0 0 3px var(--acc-dim)'
}
function blurStyle(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.borderColor = 'var(--b2)'
  e.target.style.boxShadow = 'none'
}
