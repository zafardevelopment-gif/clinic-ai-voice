'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppSelect } from '@/components/ui/FormField'

interface Subscription {
  plan: 'trial' | 'basic' | 'pro' | 'premium'
  status: 'trialing' | 'active' | 'past_due' | 'cancelled' | 'paused'
  monthly_call_limit: number | null
  calls_used_this_cycle: number
  feature_overrides: Record<string, boolean>
  trial_ends_at: string | null
  current_period_end: string | null
}

interface Plan {
  plan_code: string
  display_name: string
  features: Record<string, boolean>
  monthly_price_inr: number
  monthly_call_limit: number | null
}

interface AuditEntry {
  id: string
  action: string
  old_value: unknown
  new_value: unknown
  reason: string | null
  created_at: string
}

interface Clinic {
  id: string
  name: string
  phone: string | null
  is_active: boolean
}

const FEATURE_FLAGS = [
  { key: 'appointment_24h', label: '24h Reminder' },
  { key: 'appointment_2h',  label: '2h Reminder' },
  { key: 'post_visit',      label: 'Post-Visit' },
  { key: 'birthday',        label: 'Birthday' },
  { key: 'annual_checkup',  label: 'Annual Checkup' },
  { key: 'broadcast',       label: 'Broadcast' },
  { key: 'custom_voice',    label: 'Custom Voice' },
  { key: 'pdf_report',      label: 'PDF Report' },
]

type OverrideState = 'inherit' | 'on' | 'off'

export default function ClinicSubscriptionPage() {
  const { id } = useParams<{ id: string }>()
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [sub, setSub] = useState<Subscription | null>(null)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Form state, mirrors the subscription row.
  const [planCode, setPlanCode] = useState<Subscription['plan']>('trial')
  const [status, setStatus] = useState<Subscription['status']>('trialing')
  const [limit, setLimit] = useState<string>('')   // '' = unlimited
  const [overrides, setOverrides] = useState<Record<string, OverrideState>>({})
  const [reason, setReason] = useState('')
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([])

  async function load() {
    setLoading(true)
    const [subRes, plansRes] = await Promise.all([
      fetch(`/api/admin/clinics/${id}/subscription`).then(r => r.json()),
      fetch('/api/admin/plans').then(r => r.json()),
    ])
    if (subRes.subscription) {
      setClinic(subRes.clinic)
      setSub(subRes.subscription)
      setPlan(subRes.plan)
      setAudit(subRes.audit_log || [])
      setPlanCode(subRes.subscription.plan)
      setStatus(subRes.subscription.status)
      setLimit(
        subRes.subscription.monthly_call_limit === null
          ? ''
          : String(subRes.subscription.monthly_call_limit),
      )
      // Map current overrides into tri-state (inherit/on/off)
      const ovs = (subRes.subscription.feature_overrides || {}) as Record<string, boolean>
      const tri: Record<string, OverrideState> = {}
      for (const f of FEATURE_FLAGS) {
        if (f.key in ovs) tri[f.key] = ovs[f.key] ? 'on' : 'off'
        else tri[f.key] = 'inherit'
      }
      setOverrides(tri)
    }
    setAvailablePlans(plansRes.plans || [])
    setLoading(false)
    setDirty(false)
  }

  useEffect(() => { load() }, [id])

  function setOverride(key: string, state: OverrideState) {
    setOverrides(o => ({ ...o, [key]: state }))
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    // Build override delta: null for inherit, true/false otherwise.
    const overridePatch: Record<string, boolean | null> = {}
    for (const [key, state] of Object.entries(overrides)) {
      overridePatch[key] = state === 'inherit' ? null : state === 'on'
    }

    const res = await fetch(`/api/admin/clinics/${id}/subscription`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: planCode,
        status,
        monthly_call_limit: limit.trim() === '' ? null : parseInt(limit),
        feature_overrides: overridePatch,
        reason: reason || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setReason('')
      await load()
    } else {
      const j = await res.json().catch(() => ({}))
      alert(`Failed: ${j.error || res.statusText}`)
    }
  }

  if (loading || !sub) {
    return (
      <>
        <Topbar title="Clinic Subscription" />
        <PageCard>
          <div className="text-sm" style={{ color: 'var(--txt2)' }}>Loading…</div>
        </PageCard>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={`Subscription · ${clinic?.name || ''}`}
        subtitle="Override plan, change features, or pause billing for this clinic"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Plan + status */}
        <PageCard title="Plan & Status" className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Plan">
              <AppSelect
                value={planCode}
                onChange={e => { setPlanCode(e.target.value as Subscription['plan']); setDirty(true) }}
              >
                {availablePlans.map(p => (
                  <option key={p.plan_code} value={p.plan_code}>
                    {p.display_name} — ₹{p.monthly_price_inr.toLocaleString('en-IN')}/mo
                  </option>
                ))}
              </AppSelect>
            </FormField>

            <FormField label="Status">
              <AppSelect
                value={status}
                onChange={e => { setStatus(e.target.value as Subscription['status']); setDirty(true) }}
              >
                <option value="trialing">Trialing</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </AppSelect>
            </FormField>

            <FormField
              label="Monthly call limit"
              hint="Leave blank for unlimited (Premium-like)"
            >
              <AppInput
                type="number"
                value={limit}
                placeholder="e.g. 500"
                onChange={e => { setLimit(e.target.value); setDirty(true) }}
              />
            </FormField>

            <FormField label="Calls used this cycle">
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'var(--s3)', color: 'var(--txt)', border: '1px solid var(--b1)' }}
              >
                {sub.calls_used_this_cycle}
                {sub.monthly_call_limit !== null && (
                  <span style={{ color: 'var(--txt3)' }}> / {sub.monthly_call_limit}</span>
                )}
              </div>
            </FormField>
          </div>

          <div className="mt-4">
            <FormField label="Reason for change (saved in audit log)">
              <AppInput
                value={reason}
                placeholder="e.g. Goodwill: VIP customer, gave broadcast for free"
                onChange={e => setReason(e.target.value)}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <AppBtn variant="ghost" onClick={load} disabled={saving}>Discard</AppBtn>
            <AppBtn onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </AppBtn>
          </div>
        </PageCard>

        {/* Audit log */}
        <PageCard title="Recent Changes" subtitle="Last 20 actions">
          {audit.length === 0 ? (
            <div className="text-sm" style={{ color: 'var(--txt3)' }}>No changes yet.</div>
          ) : (
            <div className="space-y-2">
              {audit.map(a => (
                <div
                  key={a.id}
                  className="rounded-lg p-2.5 text-xs"
                  style={{ background: 'var(--s3)', border: '1px solid var(--b1)' }}
                >
                  <div className="font-semibold" style={{ color: 'var(--txt)' }}>{a.action}</div>
                  <div style={{ color: 'var(--txt3)' }}>
                    {new Date(a.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </div>
                  {a.reason && (
                    <div className="mt-1" style={{ color: 'var(--txt2)' }}>{a.reason}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </PageCard>
      </div>

      {/* Feature overrides */}
      <PageCard
        title="Feature Overrides"
        subtitle="‘Inherit’ uses plan default. ‘ON’/‘OFF’ override the plan for this clinic only."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FEATURE_FLAGS.map(f => {
            const planDefault = plan?.features?.[f.key] ?? false
            const state = overrides[f.key] || 'inherit'
            const effective = state === 'inherit' ? planDefault : state === 'on'
            return (
              <div
                key={f.key}
                className="rounded-lg p-3 flex items-center justify-between gap-3"
                style={{ background: 'var(--s3)', border: '1px solid var(--b1)' }}
              >
                <div>
                  <div className="text-sm font-medium" style={{ color: 'var(--txt)' }}>{f.label}</div>
                  <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>
                    Plan default: {planDefault ? 'on' : 'off'} · Effective: <span style={{ color: effective ? 'var(--teal)' : 'var(--rose)' }}>{effective ? 'ON' : 'OFF'}</span>
                  </div>
                </div>
                <div className="flex rounded-md overflow-hidden" style={{ border: '1px solid var(--b2)' }}>
                  {(['inherit', 'on', 'off'] as OverrideState[]).map(opt => (
                    <button
                      key={opt}
                      onClick={() => setOverride(f.key, opt)}
                      className="px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors"
                      style={{
                        background: state === opt ? 'var(--acc)' : 'transparent',
                        color: state === opt ? '#fff' : 'var(--txt2)',
                        borderLeft: opt !== 'inherit' ? '1px solid var(--b2)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </PageCard>
    </>
  )
}
