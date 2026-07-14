'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * ASHA worker login — UI ONLY, not wired to any backend yet. See
 * src/app/asha/signup/page.tsx for the rationale: ASHA auth (session
 * handling, credential verification, the actual login endpoint) is
 * deferred to a later pass covering auth for all roles together.
 */
export default function AshaLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: wire to a real ASHA login endpoint once ASHA auth is built.
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

      <div className="relative z-10 w-full max-w-[420px] px-4 animate-fadeUp">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--acc), #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.30)' }}>
            🤝
          </div>
          <h1 className="font-syne text-2xl font-bold tracking-tight" style={{ color: 'var(--txt)' }}>ClinicAI</h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: 'var(--txt2)' }}>ASHA WORKER SIGN IN</p>
        </div>

        <div className="rounded-2xl p-7" style={{ background: 'var(--s2)', border: '1px solid var(--b1)', boxShadow: '0 8px 40px rgba(0,0,0,0.55)' }}>
          <h2 className="font-syne text-lg font-bold mb-1" style={{ color: 'var(--txt)' }}>Sign In</h2>
          <p className="text-xs mb-6" style={{ color: 'var(--txt2)' }}>Enter your credentials to continue</p>

          {submitted ? (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--acc-dim)', color: 'var(--acc)', border: '1px solid rgba(16,185,129,0.2)' }}>
              Sign-in isn&apos;t live yet — ASHA login is coming soon.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--txt2)' }}>Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--acc)'; e.target.style.boxShadow = '0 0 0 3px var(--acc-dim)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--b2)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--txt2)' }}>Password</label>
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required autoComplete="current-password"
                  className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                  style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--acc)'; e.target.style.boxShadow = '0 0 0 3px var(--acc-dim)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--b2)'; e.target.style.boxShadow = 'none' }}
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-all mt-2"
                style={{ background: 'var(--acc)', boxShadow: '0 4px 16px var(--acc-dim)', cursor: 'pointer' }}
              >
                Sign In
              </button>
            </form>
          )}

          <p className="text-center text-xs mt-5" style={{ color: 'var(--txt3)' }}>
            New ASHA worker?{' '}
            <Link href="/asha/signup" style={{ color: 'var(--acc)', fontWeight: 600 }}>Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
