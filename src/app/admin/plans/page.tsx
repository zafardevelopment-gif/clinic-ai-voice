'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import { FormField, AppInput } from '@/components/ui/FormField'

interface Plan {
  id: string
  plan_code: 'trial' | 'basic' | 'pro' | 'premium'
  display_name: string
  description: string | null
  monthly_price_inr: number
  annual_price_inr: number | null
  monthly_call_limit: number | null
  features: Record<string, boolean>
  is_active: boolean
  sort_order: number
}

// Master list of feature flags shown in the editor. Adding a new flag here +
// in the SQL feature-resolution function is all it takes to introduce a new
// gated feature.
const FEATURE_FLAGS: { key: string; label: string; description: string }[] = [
  { key: 'appointment_24h',  label: '24h Appointment Reminder', description: '1 day before appointment' },
  { key: 'appointment_2h',   label: '2h Appointment Reminder',  description: '2 hours before appointment' },
  { key: 'post_visit',       label: 'Post-Visit Follow-up',     description: '3 days after the visit' },
  { key: 'birthday',         label: 'Birthday Wish',            description: 'Call on patient birthday' },
  { key: 'annual_checkup',   label: 'Annual Checkup Reminder',  description: '1 year since last visit' },
  { key: 'broadcast',        label: 'Custom Broadcast',         description: 'Mass call to all patients' },
  { key: 'custom_voice',     label: 'Custom Voice / Branding',  description: 'Premium voice + branding' },
  { key: 'pdf_report',       label: 'Monthly PDF Report',       description: 'Auto-emailed report each month' },
]

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/plans')
    const json = await res.json()
    setPlans(json.plans || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!editing) return
    setSaving(true)
    const res = await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_code: editing.plan_code,
        display_name: editing.display_name,
        description: editing.description,
        monthly_price_inr: editing.monthly_price_inr,
        annual_price_inr: editing.annual_price_inr,
        monthly_call_limit: editing.monthly_call_limit,
        features: editing.features,
        is_active: editing.is_active,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setEditing(null)
      load()
    } else {
      const j = await res.json().catch(() => ({}))
      alert(`Failed to save: ${j.error || res.statusText}`)
    }
  }

  function toggleFeature(key: string) {
    if (!editing) return
    setEditing({
      ...editing,
      features: { ...editing.features, [key]: !editing.features?.[key] },
    })
  }

  return (
    <>
      <Topbar title="Subscription Plans" subtitle="Edit pricing, call limits, and included features" />
      <PageCard
        title="Plans"
        subtitle="Changes here apply to NEW subscriptions immediately. Existing clinics keep their grandfathered terms unless you migrate them."
      >
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--txt2)' }}>Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="rounded-xl p-4 flex flex-col"
                style={{ background: 'var(--s3)', border: '1px solid var(--b1)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-syne text-lg font-bold" style={{ color: 'var(--txt)' }}>
                      {plan.display_name}
                    </div>
                    <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>
                      {plan.plan_code}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: plan.is_active ? 'var(--teal-dim)' : 'var(--rose-dim)',
                      color: plan.is_active ? 'var(--teal)' : 'var(--rose)',
                    }}
                  >
                    {plan.is_active ? 'ACTIVE' : 'HIDDEN'}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="font-syne text-2xl font-black" style={{ color: 'var(--txt)' }}>
                    ₹{plan.monthly_price_inr.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs ml-1" style={{ color: 'var(--txt2)' }}>/month</span>
                </div>

                <div className="text-xs mb-3" style={{ color: 'var(--txt2)' }}>
                  {plan.monthly_call_limit === null
                    ? 'Unlimited calls'
                    : `${plan.monthly_call_limit.toLocaleString('en-IN')} calls/month`}
                </div>

                <div className="text-xs space-y-1 mb-4 flex-1">
                  {FEATURE_FLAGS.map(f => {
                    const on = !!plan.features?.[f.key]
                    return (
                      <div key={f.key} className="flex items-center gap-2">
                        <span style={{ color: on ? 'var(--acc)' : 'var(--txt3)' }}>
                          {on ? '✓' : '×'}
                        </span>
                        <span style={{ color: on ? 'var(--txt)' : 'var(--txt3)' }}>{f.label}</span>
                      </div>
                    )
                  })}
                </div>

                <AppBtn variant="secondary" size="sm" onClick={() => setEditing(plan)}>
                  Edit Plan
                </AppBtn>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <AppModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit: ${editing.display_name}` : ''}
        footer={
          <>
            <AppBtn variant="ghost" onClick={() => setEditing(null)}>Cancel</AppBtn>
            <AppBtn onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Plan'}
            </AppBtn>
          </>
        }
      >
        {editing && (
          <div className="space-y-3">
            <FormField label="Display name">
              <AppInput
                value={editing.display_name}
                onChange={e => setEditing({ ...editing, display_name: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Monthly price (₹)">
                <AppInput
                  type="number"
                  value={editing.monthly_price_inr}
                  onChange={e => setEditing({ ...editing, monthly_price_inr: parseInt(e.target.value) || 0 })}
                />
              </FormField>
              <FormField label="Annual price (₹)">
                <AppInput
                  type="number"
                  value={editing.annual_price_inr ?? ''}
                  onChange={e => setEditing({
                    ...editing,
                    annual_price_inr: e.target.value === '' ? null : parseInt(e.target.value),
                  })}
                />
              </FormField>
            </div>

            <FormField
              label="Monthly call limit (blank = unlimited)"
            >
              <AppInput
                type="number"
                value={editing.monthly_call_limit ?? ''}
                onChange={e => setEditing({
                  ...editing,
                  monthly_call_limit: e.target.value === '' ? null : parseInt(e.target.value),
                })}
              />
            </FormField>

            <FormField label="Description">
              <AppInput
                value={editing.description ?? ''}
                onChange={e => setEditing({ ...editing, description: e.target.value })}
              />
            </FormField>

            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--txt2)' }}>
                Included features
              </div>
              <div className="space-y-2">
                {FEATURE_FLAGS.map(f => {
                  const on = !!editing.features?.[f.key]
                  return (
                    <label
                      key={f.key}
                      className="flex items-start gap-3 p-2 rounded-lg cursor-pointer"
                      style={{ background: on ? 'var(--acc-dim)' : 'transparent', border: '1px solid var(--b1)' }}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleFeature(f.key)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--txt)' }}>
                          {f.label}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>
                          {f.description}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={e => setEditing({ ...editing, is_active: e.target.checked })}
              />
              <span className="text-sm" style={{ color: 'var(--txt)' }}>
                Plan is active (visible to clinics for new subscriptions)
              </span>
            </label>
          </div>
        )}
      </AppModal>
    </>
  )
}
