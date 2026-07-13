'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput } from '@/components/ui/FormField'

interface ClinicProfile {
  name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  gstin: string | null
  invoice_prefix: string
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh',
  'Puducherry', 'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu', 'Lakshadweep',
]

export default function ClinicSettingsPage() {
  const [profile, setProfile] = useState<ClinicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/clinic/profile')
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false) })
  }, [])

  function update<K extends keyof ClinicProfile>(key: K, value: ClinicProfile[K]) {
    setProfile(p => (p ? { ...p, [key]: value } : p))
    setSaved(false)
  }

  async function save() {
    if (!profile) return
    setError('')
    if (profile.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(profile.gstin.toUpperCase())) {
      setError('GSTIN format looks invalid (expected e.g. 27ABCDE1234F1Z5)')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/clinic/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setProfile(data)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Clinic Settings" subtitle="Business & GST details used on generated invoices" />
      <div className="flex-1 overflow-y-auto p-6">
        {loading || !profile ? (
          <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
        ) : (
          <PageCard
            title="Business & Billing Details"
            subtitle="Shown as the seller details on every GST invoice you generate"
            actions={<AppBtn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</AppBtn>}
          >
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
              )}
              {saved && (
                <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>Saved.</div>
              )}

              <FormField label="Clinic / Business Name" required>
                <AppInput value={profile.name} onChange={e => update('name', e.target.value)} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Phone">
                  <AppInput value={profile.phone || ''} onChange={e => update('phone', e.target.value)} />
                </FormField>
                <FormField label="Email">
                  <AppInput type="email" value={profile.email || ''} onChange={e => update('email', e.target.value)} />
                </FormField>
              </div>

              <FormField label="Address" hint="Street / area — appears on invoices">
                <AppInput value={profile.address || ''} onChange={e => update('address', e.target.value)} />
              </FormField>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="City">
                  <AppInput value={profile.city || ''} onChange={e => update('city', e.target.value)} />
                </FormField>
                <FormField label="State" required hint="Used to decide CGST+SGST vs IGST">
                  <select
                    value={profile.state || ''}
                    onChange={e => update('state', e.target.value)}
                    style={{ width: '100%', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 8, padding: '10px 14px', color: 'var(--txt)', fontSize: 14, outline: 'none' }}
                  >
                    <option value="">Select state…</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="Pincode">
                  <AppInput value={profile.pincode || ''} onChange={e => update('pincode', e.target.value)} />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="GSTIN" hint="15-character GST number, e.g. 27ABCDE1234F1Z5. Leave blank if not GST-registered.">
                  <AppInput
                    value={profile.gstin || ''}
                    onChange={e => update('gstin', e.target.value.toUpperCase())}
                    maxLength={15}
                    placeholder="27ABCDE1234F1Z5"
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </FormField>
                <FormField label="Invoice Number Prefix" hint='e.g. "INV" → INV-2026-0001'>
                  <AppInput value={profile.invoice_prefix} onChange={e => update('invoice_prefix', e.target.value.toUpperCase())} maxLength={10} />
                </FormField>
              </div>
            </div>
          </PageCard>
        )}
      </div>
    </div>
  )
}
