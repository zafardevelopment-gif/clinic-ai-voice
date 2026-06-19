'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import AppBtn from '@/components/ui/AppBtn'

export default function EditClinicPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '', country: '',
    is_active: true,
    website_enabled: false,
    website_url: '',
    website_slug: '',
  })

  useEffect(() => {
    fetch(`/api/admin/clinics/${id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setForm({
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || '',
          is_active: data.is_active ?? true,
          website_enabled: data.website_enabled ?? false,
          website_url: data.website_url || '',
          website_slug: data.website_slug || '',
        })
        setFetching(false)
      })
  }, [id])

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      is_active: form.is_active,
      website_enabled: form.website_enabled,
      website_url: form.website_url || null,
      website_slug: form.website_slug || null,
    }
    const res = await fetch(`/api/admin/clinics/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(result.error || 'Failed to update clinic')
      setLoading(false)
      return
    }
    router.push('/admin/clinics')
    router.refresh()
  }

  if (fetching) return <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--txt2)' }}>Loading...</div>

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Edit Clinic" subtitle={form.name} />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Clinic Details */}
          <PageCard title="Clinic Details" actions={
            <div className="flex gap-2">
              <AppBtn variant="secondary" type="button" onClick={() => router.back()}>Cancel</AppBtn>
              <AppBtn type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</AppBtn>
            </div>
          }>
            {error && (
              <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Clinic Name" required>
                <AppInput value={form.name} onChange={e => set('name', e.target.value)} required />
              </FormField>
              <FormField label="Phone">
                <AppInput value={form.phone} onChange={e => set('phone', e.target.value)} />
              </FormField>
              <FormField label="Email">
                <AppInput type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </FormField>
              <FormField label="City">
                <AppInput value={form.city} onChange={e => set('city', e.target.value)} />
              </FormField>
              <FormField label="Country">
                <AppInput value={form.country} onChange={e => set('country', e.target.value)} />
              </FormField>
              <FormField label="Status">
                <AppSelect value={form.is_active ? 'true' : 'false'} onChange={e => set('is_active', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </AppSelect>
              </FormField>
              <div className="col-span-2">
                <FormField label="Address">
                  <AppTextarea value={form.address} onChange={e => set('address', e.target.value)} rows={3} />
                </FormField>
              </div>
            </div>
          </PageCard>

          {/* Website Settings — only admin can change these */}
          <PageCard title="Website Settings">
            <div className="space-y-4">
              {/* Enable toggle */}
              <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: 'var(--s2)', border: '1px solid var(--b1)' }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>Public Website</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--txt3)' }}>
                    Clinic ki public website enable/disable karo. Clinic sirf content edit kar sakti hai.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set('website_enabled', !form.website_enabled)}
                  className="relative flex-shrink-0 rounded-full transition-all duration-200"
                  style={{
                    width: 48, height: 26,
                    background: form.website_enabled ? 'var(--acc)' : 'var(--b2)',
                  }}
                >
                  <span
                    className="absolute top-1 rounded-full transition-all duration-200"
                    style={{
                      width: 18, height: 18,
                      background: '#fff',
                      left: form.website_enabled ? 26 : 4,
                    }}
                  />
                </button>
              </div>

              {form.website_enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Custom Domain / URL" hint="e.g. https://citycare.com">
                    <AppInput
                      value={form.website_url}
                      onChange={e => set('website_url', e.target.value)}
                      placeholder="https://clinicname.com"
                    />
                  </FormField>
                  <FormField label="Slug (subdomain path)" hint="e.g. city-care → /site/city-care">
                    <AppInput
                      value={form.website_slug}
                      onChange={e => set('website_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="clinic-name"
                    />
                  </FormField>
                </div>
              )}

              {form.website_enabled && (
                <div className="rounded-lg px-4 py-3 text-xs" style={{ background: 'var(--acc-dim)', color: 'var(--acc)', border: '1px solid rgba(46,134,255,0.2)' }}>
                  <strong>Website Active</strong> — Clinic apna hero banner, gallery aur content manage kar sakti hai.
                  {form.website_slug && <> Preview: <code>/site/{form.website_slug}</code></>}
                  {form.website_url && <> | Custom domain: <code>{form.website_url}</code></>}
                </div>
              )}
            </div>
          </PageCard>
        </form>
      </div>
    </div>
  )
}
