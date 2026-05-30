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
    name: '', phone: '', email: '', address: '', city: '', country: '', is_active: true,
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
      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit}>
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
        </form>
      </div>
    </div>
  )
}
