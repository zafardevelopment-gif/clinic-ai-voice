'use client'

import { useEffect, useRef, useState } from 'react'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { AppInput } from '@/components/ui/FormField'
import StatusBadge from '@/components/ui/StatusBadge'

interface DomainState {
  custom_domain: string | null
  domain_status: 'unset' | 'pending' | 'verified' | 'error'
  domain_verification: Array<{ type: string; domain: string; value: string; reason: string }> | null
}

const STATUS_LABEL: Record<DomainState['domain_status'], string> = {
  unset: 'Not connected',
  pending: 'Pending verification',
  verified: 'Live',
  error: 'DNS misconfigured',
}

/**
 * Custom domain connect/verify UI. Registration is fully automatic via the
 * Vercel Domains API (src/lib/vercel/domains.ts) — the clinic just types
 * their domain and adds the DNS record we show them; no manual dashboard
 * step on our side.
 */
export default function CustomDomainCard() {
  const [state, setState] = useState<DomainState | null>(null)
  const [loading, setLoading] = useState(true)
  const [domainInput, setDomainInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/clinic/website/domain')
    const data = await res.json()
    if (res.ok) setState(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  // Auto-poll verification status every 15s while pending.
  useEffect(() => {
    if (state?.domain_status === 'pending') {
      pollRef.current = setInterval(checkStatus, 15000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [state?.domain_status]) // eslint-disable-line react-hooks/exhaustive-deps

  async function connect() {
    setError('')
    if (!domainInput.trim()) { setError('Enter a domain'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/clinic/website/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to connect domain'); return }
      setState(data)
      setDomainInput('')
    } finally {
      setSaving(false)
    }
  }

  async function checkStatus() {
    setChecking(true)
    try {
      const res = await fetch('/api/clinic/website/domain/check', { method: 'POST' })
      const data = await res.json()
      if (res.ok) setState(s => s ? { ...s, ...data } : s)
    } finally {
      setChecking(false)
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect this domain? Your website will stay available at the medivoice.ai link.')) return
    setSaving(true)
    try {
      await fetch('/api/clinic/website/domain', { method: 'DELETE' })
      setState({ custom_domain: null, domain_status: 'unset', domain_verification: null })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageCard title="Custom Domain"><div className="text-sm" style={{ color: 'var(--txt3)' }}>Loading…</div></PageCard>
  }

  return (
    <PageCard
      title="Custom Domain"
      subtitle="Point your own domain (e.g. drclinic.com) at this website"
      actions={state?.custom_domain ? <StatusBadge variant={state.domain_status === 'verified' ? 'confirmed' : state.domain_status === 'error' ? 'cancelled' : 'pending'} label={STATUS_LABEL[state.domain_status]} /> : undefined}
    >
      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm mb-3" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
      )}

      {!state?.custom_domain ? (
        <div className="flex gap-2 items-end flex-wrap">
          <div className="flex-1" style={{ minWidth: 220 }}>
            <AppInput value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="drclinic.com" />
          </div>
          <AppBtn onClick={connect} disabled={saving}>{saving ? 'Connecting…' : 'Connect Domain'}</AppBtn>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{state.custom_domain}</div>
            <div className="flex gap-2">
              {state.domain_status === 'pending' && (
                <AppBtn variant="secondary" size="sm" onClick={checkStatus} disabled={checking}>{checking ? 'Checking…' : 'Check Now'}</AppBtn>
              )}
              <AppBtn variant="ghost" size="sm" onClick={disconnect} disabled={saving}>Disconnect</AppBtn>
            </div>
          </div>

          {state.domain_status === 'verified' && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>
              ✓ Your website is live at <a href={`https://${state.custom_domain}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{state.custom_domain}</a>
            </div>
          )}

          {(state.domain_status === 'pending' || state.domain_status === 'error') && (
            <div className="rounded-lg p-4" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--txt3)' }}>
                Add this DNS record at your domain registrar
              </div>
              {state.domain_verification && state.domain_verification.length > 0 ? (
                <div className="space-y-2">
                  {state.domain_verification.map((v, i) => (
                    <div key={i} className="text-xs font-mono p-2 rounded" style={{ background: 'var(--s2)', color: 'var(--txt2)' }}>
                      Type: {v.type} · Name: {v.domain} · Value: {v.value}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs space-y-1" style={{ color: 'var(--txt2)' }}>
                  <div>If using a subdomain (e.g. <code>booking.drclinic.com</code>): add a <strong>CNAME</strong> record pointing to <code>cname.vercel-dns.com</code></div>
                  <div>If using the root domain (e.g. <code>drclinic.com</code>): add an <strong>A</strong> record pointing to <code>76.76.21.21</code></div>
                </div>
              )}
              <div className="text-[11px] mt-3" style={{ color: 'var(--txt3)' }}>
                DNS changes can take a few minutes to a few hours to take effect. We check automatically every 15 seconds while this page is open.
              </div>
            </div>
          )}
        </div>
      )}
    </PageCard>
  )
}
