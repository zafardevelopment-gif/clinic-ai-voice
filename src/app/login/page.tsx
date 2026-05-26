'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type DbStatus = { connected: boolean; userCount?: number; users?: { email: string; role: string; is_active: boolean }[]; error?: string; hint?: string } | null

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dbStatus, setDbStatus] = useState<DbStatus>(null)
  const [dbLoading, setDbLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/db-test')
      .then(r => r.json())
      .then(d => setDbStatus(d))
      .catch(e => setDbStatus({ connected: false, error: e.message }))
      .finally(() => setDbLoading(false))
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Login failed')
      setLoading(false)
      return
    }

    router.push(data.redirectTo)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Background glows */}
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
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, var(--acc), #059669)', boxShadow: '0 8px 32px rgba(16,185,129,0.30)' }}>
            🎙️
          </div>
          <h1 className="font-syne text-2xl font-bold tracking-tight" style={{ color: 'var(--txt)' }}>
            ClinicAI
          </h1>
          <p className="text-xs mt-1 tracking-wide" style={{ color: 'var(--txt2)' }}>
            AI VOICE AGENT PLATFORM
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{
          background: 'var(--s2)',
          border: '1px solid var(--b1)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
        }}>
          <h2 className="font-syne text-lg font-bold mb-1" style={{ color: 'var(--txt)' }}>
            Sign In
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--txt2)' }}>
            Enter your credentials to access the platform
          </p>

          {error && (
            <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{
              background: 'var(--rose-dim)',
              color: 'var(--rose)',
              border: '1px solid rgba(255,78,106,0.2)',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--txt2)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                required
                autoComplete="email"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--acc)'; e.target.style.boxShadow = '0 0 0 3px var(--acc-dim)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--b2)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
                style={{ color: 'var(--txt2)' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-all"
                style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--acc)'; e.target.style.boxShadow = '0 0 0 3px var(--acc-dim)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--b2)'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-sm font-semibold text-white transition-all mt-2"
              style={{
                background: loading ? 'var(--s3)' : 'var(--acc)',
                boxShadow: loading ? 'none' : '0 4px 16px var(--acc-dim)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--txt3)' }}>
          Contact your administrator to get access
        </p>

        {/* DB Connection Status */}
        <div className="mt-4 rounded-xl px-4 py-3 text-xs font-mono" style={{
          background: 'var(--s2)',
          border: `1px solid ${dbLoading ? 'var(--b1)' : dbStatus?.connected ? 'rgba(0,212,170,0.3)' : 'rgba(255,78,106,0.3)'}`,
        }}>
          <div className="flex items-center gap-2 mb-1">
            <span style={{
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              background: dbLoading ? '#888' : dbStatus?.connected ? '#00d4aa' : '#ff4e6a',
            }} />
            <span style={{ color: 'var(--txt2)' }}>
              {dbLoading ? 'Checking DB connection...' : dbStatus?.connected ? `DB Connected — ${dbStatus.userCount} user(s) found` : 'DB Connection FAILED'}
            </span>
          </div>
          {!dbLoading && dbStatus?.connected && dbStatus.users?.map(u => (
            <div key={u.email} style={{ color: 'var(--txt3)', paddingLeft: 16 }}>
              {u.email} · {u.role} · {u.is_active ? 'active' : '⚠ INACTIVE'}
            </div>
          ))}
          {!dbLoading && !dbStatus?.connected && (
            <div style={{ color: '#ff4e6a', paddingLeft: 16 }}>
              {dbStatus?.error}<br />
              <span style={{ color: 'var(--txt3)' }}>{dbStatus?.hint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
