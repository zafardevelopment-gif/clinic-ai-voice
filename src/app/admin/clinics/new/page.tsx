'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import { FormField, AppInput, AppTextarea } from '@/components/ui/FormField'
import AppBtn from '@/components/ui/AppBtn'

export default function NewClinicPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', city: '', country: 'Pakistan',
  })

  function set(field: string, value: string) {
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
    }
    const { error: err } = await supabase.from('clinics').insert(payload)
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/admin/clinics')
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="New Clinic" subtitle="Register a new clinic on the platform" />
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
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
              <FormField label="Phone">
                <AppInput value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 300 0000000" />
              </FormField>
              <FormField label="Email">
                <AppInput type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@clinic.com" />
              </FormField>
              <FormField label="City">
                <AppInput value={form.city} onChange={e => set('city', e.target.value)} placeholder="Karachi" />
              </FormField>
              <FormField label="Country">
                <AppInput value={form.country} onChange={e => set('country', e.target.value)} placeholder="Pakistan" />
              </FormField>
              <div className="col-span-2">
                <FormField label="Address">
                  <AppTextarea value={form.address} onChange={e => set('address', e.target.value)} placeholder="Street address..." rows={3} />
                </FormField>
              </div>
            </div>
          </PageCard>
        </form>
      </div>
    </div>
  )
}
