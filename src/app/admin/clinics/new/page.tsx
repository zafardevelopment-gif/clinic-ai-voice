'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import { FormField, AppInput, AppTextarea } from '@/components/ui/FormField'
import AppBtn from '@/components/ui/AppBtn'

type OnboardingMode = 'forwarding' | 'llp_dedicated' | 'own_kyc'

const PLATFORM_SHARED_TWILIO_NUMBER = '+12692800645'

export default function NewClinicPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<OnboardingMode>('forwarding')
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '', country: 'India',
    forwarded_from_number: '', twilio_number: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let twilioNumber: string | null = null
    let forwardedFromNumber: string | null = null
    let twilioNumberOwner: 'platform' | 'clinic' | null = null

    if (mode === 'forwarding') {
      if (!form.forwarded_from_number) {
        setError("Clinic ka existing number (jo patients dial karte hain) zaroori hai.")
        setLoading(false)
        return
      }
      forwardedFromNumber = form.forwarded_from_number
      twilioNumber = PLATFORM_SHARED_TWILIO_NUMBER
      twilioNumberOwner = 'platform'
    } else if (mode === 'llp_dedicated') {
      if (!form.twilio_number) {
        setError('Twilio number zaroori hai (aapne LLP se kharida hua).')
        setLoading(false)
        return
      }
      twilioNumber = form.twilio_number
      twilioNumberOwner = 'platform'
    } else if (mode === 'own_kyc') {
      if (!form.twilio_number) {
        setError('Clinic ka Twilio number zaroori hai (unke KYC se).')
        setLoading(false)
        return
      }
      twilioNumber = form.twilio_number
      twilioNumberOwner = 'clinic'
    }

    const payload = {
      name: form.name,
      phone: form.phone || twilioNumber,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      onboarding_mode: mode,
      forwarded_from_number: forwardedFromNumber,
      twilio_number: twilioNumber,
      twilio_number_owner: twilioNumberOwner,
    }

    const res = await fetch('/api/admin/clinics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(result.error || 'Failed to create clinic')
      setLoading(false)
      return
    }
    router.push('/admin/clinics')
    router.refresh()
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="New Clinic" subtitle="Register a new clinic on the platform" />
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <PageCard title="Onboarding Mode">
              <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
                Choose how this clinic will receive calls:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ModeCard
                  selected={mode === 'forwarding'}
                  title="Call Forwarding"
                  badge="Quick start"
                  description="Clinic apne existing number ko shared platform Twilio number par forward karwati hai. No number purchase required."
                  onClick={() => setMode('forwarding')}
                />
                <ModeCard
                  selected={mode === 'llp_dedicated'}
                  title="LLP Dedicated"
                  badge="Premium"
                  description="Aap (platform LLP) ek dedicated Twilio number kharidte ho aur is clinic ko assign karte ho."
                  onClick={() => setMode('llp_dedicated')}
                />
                <ModeCard
                  selected={mode === 'own_kyc'}
                  title="Clinic's Own KYC"
                  badge="Enterprise"
                  description="Clinic ne apne business KYC se khud Twilio number liya hai. Webhook ko platform se connect kiya jata hai."
                  onClick={() => setMode('own_kyc')}
                />
              </div>
            </PageCard>
          </div>

          <PageCard title="Clinic Details" actions={
            <div className="flex gap-2">
              <AppBtn variant="secondary" type="button" onClick={() => router.back()}>Cancel</AppBtn>
              <AppBtn type="submit" disabled={loading}>{loading ? 'Saving...' : 'Create Clinic'}</AppBtn>
            </div>
          }>
            {error && (
              <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Clinic Name" required>
                <AppInput value={form.name} onChange={e => set('name', e.target.value)} placeholder="City Medical Center" required />
              </FormField>
              <FormField label="Contact Phone (admin)">
                <AppInput value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
              </FormField>
              <FormField label="Email">
                <AppInput type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@clinic.com" />
              </FormField>
              <FormField label="City">
                <AppInput value={form.city} onChange={e => set('city', e.target.value)} placeholder="Mumbai" />
              </FormField>
              <FormField label="Country">
                <AppInput value={form.country} onChange={e => set('country', e.target.value)} placeholder="India" />
              </FormField>
              <div className="col-span-2">
                <FormField label="Address">
                  <AppTextarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address..." rows={2} />
                </FormField>
              </div>
            </div>
          </PageCard>

          {mode === 'forwarding' && (
            <div className="mt-6">
              <PageCard title="Call Forwarding Setup">
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="Clinic's existing phone number (jo patients dial karte hain)" required>
                    <AppInput
                      value={form.forwarded_from_number}
                      onChange={e => set('forwarded_from_number', e.target.value)}
                      placeholder="+91 22 1234 5678"
                      required
                    />
                  </FormField>
                  <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--text)' }}>
                    <p className="font-semibold mb-2">Clinic ko yeh setup karna hai:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Apne phone provider (Airtel/BSNL/Jio) ko call karein</li>
                      <li>Bolein: <strong>&quot;Call forwarding enable kijiye is number par&quot;</strong></li>
                      <li>Forwarding destination: <code className="px-2 py-1 rounded" style={{ background: 'var(--bg)' }}>{PLATFORM_SHARED_TWILIO_NUMBER}</code></li>
                      <li>Once active, jab patient clinic ka number dial karega, call AI receptionist par forward ho jayegi</li>
                    </ol>
                  </div>
                </div>
              </PageCard>
            </div>
          )}

          {mode === 'llp_dedicated' && (
            <div className="mt-6">
              <PageCard title="Dedicated Twilio Number (LLP)">
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="Twilio number (aapne LLP se kharida)" required>
                    <AppInput
                      value={form.twilio_number}
                      onChange={e => set('twilio_number', e.target.value)}
                      placeholder="+91 22 9999 1111"
                      required
                    />
                  </FormField>
                  <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--text)' }}>
                    <p className="font-semibold mb-2">Platform setup checklist:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Twilio console se yeh India number purchase karein (LLP ke naam)</li>
                      <li>Number ke Voice Configuration mein webhook URL set karein</li>
                      <li>Webhook URL: <code className="px-2 py-1 rounded" style={{ background: 'var(--bg)' }}>{typeof window !== 'undefined' ? `${window.location.origin}/api/voice/incoming-call` : '/api/voice/incoming-call'}</code></li>
                      <li>HTTP method: POST</li>
                      <li>Clinic ko yeh number share karein — patients direct dial karenge</li>
                    </ol>
                  </div>
                </div>
              </PageCard>
            </div>
          )}

          {mode === 'own_kyc' && (
            <div className="mt-6">
              <PageCard title="Clinic's Own Twilio Number">
                <div className="grid grid-cols-1 gap-4">
                  <FormField label="Twilio number (clinic ne apne KYC se liya)" required>
                    <AppInput
                      value={form.twilio_number}
                      onChange={e => set('twilio_number', e.target.value)}
                      placeholder="+91 22 8888 2222"
                      required
                    />
                  </FormField>
                  <div className="rounded-lg p-4 text-sm" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', color: 'var(--text)' }}>
                    <p className="font-semibold mb-2">Clinic ko apne Twilio dashboard mein yeh karna hai:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Twilio console mein apne purchased number par jaayein</li>
                      <li>Voice Configuration → A call comes in → Webhook</li>
                      <li>URL: <code className="px-2 py-1 rounded" style={{ background: 'var(--bg)' }}>{typeof window !== 'undefined' ? `${window.location.origin}/api/voice/incoming-call` : '/api/voice/incoming-call'}</code></li>
                      <li>HTTP method: POST</li>
                      <li>Save → AI receptionist activate ho jayega</li>
                    </ol>
                  </div>
                </div>
              </PageCard>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

function ModeCard({
  selected, title, badge, description, onClick,
}: {
  selected: boolean
  title: string
  badge: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-lg p-4 transition"
      style={{
        background: selected ? 'var(--accent-dim)' : 'var(--card)',
        border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
        cursor: 'pointer',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold" style={{ color: 'var(--text)' }}>{title}</h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>{badge}</span>
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{description}</p>
    </button>
  )
}
