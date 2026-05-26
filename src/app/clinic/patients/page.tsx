'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import type { Patient } from '@/types/database'

const EMPTY_FORM = {
  full_name: '', phone: '', email: '', date_of_birth: '',
  gender: '', address: '', notes: '',
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    fetch('/api/clinic/patients')
      .then(r => r.json())
      .then(d => setPatients(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setSaveError(''); setOpen(true) }
  function openEdit(p: Patient) {
    setForm({
      full_name: p.full_name,
      phone: p.phone || '',
      email: p.email || '',
      date_of_birth: p.date_of_birth || '',
      gender: p.gender || '',
      address: p.address || '',
      notes: p.notes || '',
    })
    setEditId(p.id); setSaveError(''); setOpen(true)
  }

  async function save() {
    if (!form.full_name.trim()) return
    setSaving(true); setSaveError('')
    const payload = {
      full_name: form.full_name,
      phone: form.phone || null,
      email: form.email || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      address: form.address || null,
      notes: form.notes || null,
    }
    try {
      if (editId) {
        const res = await fetch(`/api/clinic/patients/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); return }
        setPatients(prev => prev.map(p => p.id === editId ? data : p))
      } else {
        const res = await fetch('/api/clinic/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); return }
        setPatients(prev => [...prev, data])
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function deletePatient(id: string) {
    const res = await fetch(`/api/clinic/patients/${id}`, { method: 'DELETE' })
    if (res.ok) setPatients(prev => prev.filter(p => p.id !== id))
    setDeleteConfirm(null)
  }

  const filtered = patients.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search)
  )

  const f = (k: keyof typeof EMPTY_FORM, v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Patients" subtitle={`${patients.length} registered`}
        actions={<AppBtn icon="+" onClick={openNew}>Add Patient</AppBtn>} />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="Patient Registry" noPad
          actions={
            <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
              style={{ background: 'var(--s1)', border: '1px solid var(--b2)' }}>
              <span style={{ color: 'var(--txt3)' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone..."
                className="bg-transparent outline-none text-sm" style={{ color: 'var(--txt)', width: 200 }} />
            </div>
          }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Patient', 'Phone', 'Gender', 'DOB', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient, i) => (
                <tr key={patient.id} className="group">
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{patient.full_name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{patient.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)', fontFamily: 'monospace' }}>
                    {patient.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {patient.date_of_birth || '—'}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="flex gap-2">
                      <AppBtn variant="secondary" size="sm" onClick={() => openEdit(patient)}>Edit</AppBtn>
                      <AppBtn variant="danger" size="sm" onClick={() => setDeleteConfirm(patient.id)}>Delete</AppBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">🧑‍🤝‍🧑</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>{search ? 'No matching patients' : 'No patients yet'}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>

      {/* Add/Edit Modal */}
      <AppModal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit Patient' : 'Add Patient'} size="lg"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setOpen(false)}>Cancel</AppBtn>
            <AppBtn onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Patient'}</AppBtn>
          </>
        }>
        <div className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
              {saveError}
            </div>
          )}
          <FormField label="Full Name" required>
            <AppInput value={form.full_name} onChange={e => f('full_name', e.target.value)} required />
          </FormField>
          <FormField label="Phone">
            <AppInput value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+91 300 0000000" />
          </FormField>
          <FormField label="Email">
            <AppInput type="email" value={form.email} onChange={e => f('email', e.target.value)} />
          </FormField>
          <FormField label="Date of Birth">
            <AppInput type="date" value={form.date_of_birth} onChange={e => f('date_of_birth', e.target.value)} />
          </FormField>
          <FormField label="Gender">
            <AppSelect value={form.gender} onChange={e => f('gender', e.target.value)}>
              <option value="">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </AppSelect>
          </FormField>
          <FormField label="Address">
            <AppInput value={form.address} onChange={e => f('address', e.target.value)} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Notes">
              <AppTextarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={3} />
            </FormField>
          </div>
        </div>
      </AppModal>

      {/* Delete Confirm Modal */}
      <AppModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Patient"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</AppBtn>
            <AppBtn variant="danger" onClick={() => deleteConfirm && deletePatient(deleteConfirm)}>Delete</AppBtn>
          </>
        }>
        <p style={{ color: 'var(--txt2)' }}>
          Are you sure you want to delete this patient? This action cannot be undone.
        </p>
      </AppModal>
    </div>
  )
}
