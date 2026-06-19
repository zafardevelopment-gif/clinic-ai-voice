'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppTextarea } from '@/components/ui/FormField'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

interface WebsiteSettings {
  name: string
  slug: string
  website_enabled: boolean
  custom_domain: string | null
  tagline: string
  theme_color: string
  logo_url: string
  website_about: string
  website_hours: Record<string, string>
  phone: string
  email: string
  address: string
  city: string
  country: string
  social_facebook: string
  social_instagram: string
  social_whatsapp: string
}

const EMPTY: WebsiteSettings = {
  name: '',
  slug: '',
  website_enabled: false,
  custom_domain: null,
  tagline: '',
  theme_color: '#10b981',
  logo_url: '',
  website_about: '',
  website_hours: {},
  phone: '',
  email: '',
  address: '',
  city: '',
  country: '',
  social_facebook: '',
  social_instagram: '',
  social_whatsapp: '',
}

export default function WebsitePage() {
  const [settings, setSettings] = useState<WebsiteSettings>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clinic/website')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) {
          setSettings({
            name: data.name || '',
            slug: data.slug || '',
            website_enabled: data.website_enabled ?? false,
            custom_domain: data.custom_domain || null,
            tagline: data.tagline || '',
            theme_color: data.theme_color || '#10b981',
            logo_url: data.logo_url || '',
            website_about: data.website_about || '',
            website_hours: data.website_hours || {},
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            city: data.city || '',
            country: data.country || '',
            social_facebook: data.social_facebook || '',
            social_instagram: data.social_instagram || '',
            social_whatsapp: data.social_whatsapp || '',
          })
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function setHour(day: string, value: string) {
    setSettings(p => ({ ...p, website_hours: { ...p.website_hours, [day]: value } }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
    const res = await fetch('/api/clinic/website', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        website_enabled: settings.website_enabled,
        tagline: settings.tagline || null,
        theme_color: settings.theme_color,
        logo_url: settings.logo_url || null,
        website_about: settings.website_about || null,
        website_hours: settings.website_hours,
        phone: settings.phone || null,
        email: settings.email || null,
        address: settings.address || null,
        city: settings.city || null,
        country: settings.country || null,
        social_facebook: settings.social_facebook || null,
        social_instagram: settings.social_instagram || null,
        social_whatsapp: settings.social_whatsapp || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Save failed')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const websiteUrl = settings.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${settings.slug}`
    : null

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="My Website" subtitle="Manage your clinic's public website" />
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: 'var(--txt3)' }}>Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="My Website"
        subtitle="Customize your clinic's public website"
        actions={
          <AppBtn onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </AppBtn>
        }
      />

      <div className="flex-1 overflow-y-auto p-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {error && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(220,38,38,0.2)' }}>
            {error}
          </div>
        )}

        {/* ── Enable / Preview ── */}
        <PageCard title="Website Status">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <p className="text-sm" style={{ color: 'var(--txt2)', marginBottom: 8 }}>
                Your public website URL:
              </p>
              {websiteUrl ? (
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--acc)', fontWeight: 600, fontSize: 14 }}>
                  {websiteUrl}
                </a>
              ) : (
                <span style={{ color: 'var(--txt3)', fontSize: 14 }}>Slug not configured — contact admin</span>
              )}
              {settings.custom_domain && (
                <p className="text-xs mt-1" style={{ color: 'var(--txt3)' }}>
                  Custom domain: {settings.custom_domain}
                </p>
              )}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>
                {settings.website_enabled ? 'Website is Live' : 'Website is Hidden'}
              </span>
              <div
                onClick={() => setSettings(p => ({ ...p, website_enabled: !p.website_enabled }))}
                style={{
                  width: 44, height: 24, borderRadius: 100, cursor: 'pointer',
                  background: settings.website_enabled ? 'var(--acc)' : 'var(--b2)',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                <div style={{
                  position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', transition: 'left 0.2s',
                  left: settings.website_enabled ? 23 : 3,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }} />
              </div>
            </label>
          </div>
        </PageCard>

        {/* ── Branding ── */}
        <PageCard title="Branding">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tagline" hint="Short line below your clinic name">
              <AppInput value={settings.tagline} onChange={e => setSettings(p => ({ ...p, tagline: e.target.value }))}
                placeholder="Caring for your health, every step of the way" />
            </FormField>

            <FormField label="Brand Color" hint="Used for buttons and accents on your website">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input type="color" value={settings.theme_color}
                  onChange={e => setSettings(p => ({ ...p, theme_color: e.target.value }))}
                  style={{ width: 44, height: 40, borderRadius: 8, border: '1.5px solid var(--b1)', cursor: 'pointer', padding: 2 }} />
                <AppInput value={settings.theme_color}
                  onChange={e => setSettings(p => ({ ...p, theme_color: e.target.value }))}
                  placeholder="#10b981" />
              </div>
            </FormField>

            <div className="col-span-2">
              <FormField label="Logo URL" hint="Paste a direct link to your logo image (recommended: PNG, transparent background)">
                <AppInput value={settings.logo_url} onChange={e => setSettings(p => ({ ...p, logo_url: e.target.value }))}
                  placeholder="https://yoursite.com/logo.png" />
              </FormField>
              {settings.logo_url && (
                <div style={{ marginTop: 10 }}>
                  <img src={settings.logo_url} alt="Logo preview"
                    style={{ height: 48, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--b1)', padding: 6, background: '#fff' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}
            </div>
          </div>
        </PageCard>

        {/* ── About ── */}
        <PageCard title="About Section">
          <FormField label="About Your Clinic" hint="This appears on your website's About section">
            <AppTextarea value={settings.website_about}
              onChange={e => setSettings(p => ({ ...p, website_about: e.target.value }))}
              placeholder="Tell patients about your clinic, specialties, mission…"
              rows={5} />
          </FormField>
        </PageCard>

        {/* ── Contact Info ── */}
        <PageCard title="Contact Information">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <AppInput value={settings.phone} onChange={e => setSettings(p => ({ ...p, phone: e.target.value }))}
                placeholder="+92 300 0000000" type="tel" />
            </FormField>
            <FormField label="Email">
              <AppInput value={settings.email} onChange={e => setSettings(p => ({ ...p, email: e.target.value }))}
                placeholder="clinic@example.com" type="email" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Address">
                <AppInput value={settings.address} onChange={e => setSettings(p => ({ ...p, address: e.target.value }))}
                  placeholder="Street address" />
              </FormField>
            </div>
            <FormField label="City">
              <AppInput value={settings.city} onChange={e => setSettings(p => ({ ...p, city: e.target.value }))}
                placeholder="Karachi" />
            </FormField>
            <FormField label="Country">
              <AppInput value={settings.country} onChange={e => setSettings(p => ({ ...p, country: e.target.value }))}
                placeholder="Pakistan" />
            </FormField>
          </div>
        </PageCard>

        {/* ── Working Hours ── */}
        <PageCard title="Working Hours">
          <p className="text-sm mb-4" style={{ color: 'var(--txt3)' }}>
            Enter timings in any format, e.g. "9:00 AM – 5:00 PM" or "Closed". Leave blank to hide that day.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {DAYS.map(day => (
              <FormField key={day} label={day}>
                <AppInput
                  value={settings.website_hours[day] || ''}
                  onChange={e => setHour(day, e.target.value)}
                  placeholder="9:00 AM – 6:00 PM"
                />
              </FormField>
            ))}
          </div>
        </PageCard>

        {/* ── Social ── */}
        <PageCard title="Social Links">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Facebook URL">
              <AppInput value={settings.social_facebook}
                onChange={e => setSettings(p => ({ ...p, social_facebook: e.target.value }))}
                placeholder="https://facebook.com/yourclinic" />
            </FormField>
            <FormField label="Instagram URL">
              <AppInput value={settings.social_instagram}
                onChange={e => setSettings(p => ({ ...p, social_instagram: e.target.value }))}
                placeholder="https://instagram.com/yourclinic" />
            </FormField>
            <FormField label="WhatsApp Number">
              <AppInput value={settings.social_whatsapp}
                onChange={e => setSettings(p => ({ ...p, social_whatsapp: e.target.value }))}
                placeholder="+92 300 0000000" />
            </FormField>
          </div>
        </PageCard>

        {/* Save button at bottom too */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <AppBtn onClick={save} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
          </AppBtn>
        </div>

      </div>
    </div>
  )
}
