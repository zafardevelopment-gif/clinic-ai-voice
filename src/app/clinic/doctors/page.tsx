'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import type { Doctor, Department } from '@/types/database'

interface DoctorWithDept extends Doctor {
  departments?: { name: string } | null
}

const EMPTY_FORM = {
  full_name: '', specialization: '', phone: '', email: '', bio: '',
  department_id: '', booking_min_hours: 2, booking_max_days: 30,
  slot_duration_minutes: 30, years_of_experience: '', qualifications: '',
  consultation_fee: '', languages_spoken: '',
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<DoctorWithDept[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    Promise.all([
      fetch('/api/clinic/doctors').then(r => r.json()),
      fetch('/api/clinic/departments').then(r => r.json()),
    ]).then(([docs, depts]) => {
      setDoctors(Array.isArray(docs) ? docs : [])
      setDepartments(Array.isArray(depts) ? depts.filter((d: Department) => d.is_active) : [])
    }).finally(() => setLoading(false))
  }, [])

  function openNew() { setForm(EMPTY_FORM); setEditId(null); setSaveError(''); setOpen(true) }
  function openEdit(doc: DoctorWithDept) {
    setForm({
      full_name: doc.full_name,
      specialization: doc.specialization || '',
      phone: doc.phone || '',
      email: doc.email || '',
      bio: doc.bio || '',
      department_id: doc.department_id || '',
      booking_min_hours: doc.booking_min_hours,
      booking_max_days: doc.booking_max_days,
      slot_duration_minutes: doc.slot_duration_minutes,
      years_of_experience: doc.years_of_experience != null ? String(doc.years_of_experience) : '',
      qualifications: doc.qualifications || '',
      consultation_fee: doc.consultation_fee != null ? String(doc.consultation_fee) : '',
      languages_spoken: doc.languages_spoken ? doc.languages_spoken.join(', ') : '',
    })
    setEditId(doc.id)
    setSaveError('')
    setOpen(true)
  }

  async function save() {
    if (!form.full_name.trim()) return
    setSaving(true)
    setSaveError('')
    const payload = {
      full_name: form.full_name,
      specialization: form.specialization || null,
      phone: form.phone || null,
      email: form.email || null,
      bio: form.bio || null,
      department_id: form.department_id || null,
      booking_min_hours: form.booking_min_hours,
      booking_max_days: form.booking_max_days,
      slot_duration_minutes: form.slot_duration_minutes,
      years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : null,
      qualifications: form.qualifications || null,
      consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : null,
      languages_spoken: form.languages_spoken ? form.languages_spoken.split(',').map(s => s.trim()).filter(Boolean) : null,
    }
    try {
      if (editId) {
        const res = await fetch(`/api/clinic/doctors/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); setSaving(false); return }
        setDoctors(prev => prev.map(d => d.id === editId ? data : d))
      } else {
        const res = await fetch('/api/clinic/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); setSaving(false); return }
        setDoctors(prev => [...prev, data])
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteDoctor(id: string) {
    const res = await fetch(`/api/clinic/doctors/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDoctors(prev => prev.filter(d => d.id !== id))
    }
    setDeleteConfirm(null)
  }

  const f = (k: keyof typeof EMPTY_FORM, v: string | number) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Doctors" subtitle={`${doctors.length} registered`}
        actions={<AppBtn icon="+" onClick={openNew}>Add Doctor</AppBtn>} />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="Medical Staff" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Doctor', 'Department', 'Phone', 'Fee', 'Slot', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc, i) => (
                <tr key={doc.id} className="group">
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{doc.full_name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>
                      {doc.specialization || '—'}
                      {doc.years_of_experience ? ` · ${doc.years_of_experience}yr exp` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {doc.departments?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)', fontFamily: 'monospace' }}>
                    {doc.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {doc.consultation_fee != null ? `Rs ${doc.consultation_fee}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {doc.slot_duration_minutes}min
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={doc.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="flex gap-2">
                      <AppBtn variant="secondary" size="sm" onClick={() => openEdit(doc)}>Edit</AppBtn>
                      <AppBtn variant="danger" size="sm" onClick={() => setDeleteConfirm(doc.id)}>Delete</AppBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && doctors.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">👨‍⚕️</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No doctors added yet</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>

      {/* Add/Edit Modal */}
      <AppModal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit Doctor' : 'Add Doctor'} size="lg"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setOpen(false)}>Cancel</AppBtn>
            <AppBtn onClick={save} disabled={saving || !form.full_name.trim()}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Doctor'}</AppBtn>
          </>
        }>
        <div className="grid grid-cols-2 gap-4">
          {saveError && (
            <div className="col-span-2 rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
              {saveError}
            </div>
          )}
          {/* Basic Info */}
          <FormField label="Full Name" required>
            <AppInput value={form.full_name} onChange={e => f('full_name', e.target.value)} placeholder="Dr. Ahmed Khan" required />
          </FormField>
          <FormField label="Specialization">
            <AppInput value={form.specialization} onChange={e => f('specialization', e.target.value)} placeholder="Cardiologist" />
          </FormField>
          <FormField label="Department">
            <AppSelect value={form.department_id} onChange={e => f('department_id', e.target.value)}>
              <option value="">— No Department —</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </AppSelect>
          </FormField>
          <FormField label="Years of Experience">
            <AppInput type="number" min={0} max={60} value={form.years_of_experience} onChange={e => f('years_of_experience', e.target.value)} placeholder="e.g. 10" />
          </FormField>
          <FormField label="Phone">
            <AppInput value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+91 300 0000000" />
          </FormField>
          <FormField label="Email">
            <AppInput type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="doctor@clinic.com" />
          </FormField>
          <FormField label="Consultation Fee (Rs)">
            <AppInput type="number" min={0} value={form.consultation_fee} onChange={e => f('consultation_fee', e.target.value)} placeholder="e.g. 1500" />
          </FormField>
          <FormField label="Slot Duration (min)">
            <AppSelect value={String(form.slot_duration_minutes)} onChange={e => f('slot_duration_minutes', Number(e.target.value))}>
              <option value="15">15 minutes</option>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </AppSelect>
          </FormField>
          <FormField label="Min Booking Hours Ahead">
            <AppInput type="number" min={0} value={form.booking_min_hours} onChange={e => f('booking_min_hours', Number(e.target.value))} />
          </FormField>
          <FormField label="Max Booking Days Ahead">
            <AppInput type="number" min={1} value={form.booking_max_days} onChange={e => f('booking_max_days', Number(e.target.value))} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Qualifications">
              <AppInput value={form.qualifications} onChange={e => f('qualifications', e.target.value)} placeholder="MBBS, FCPS, MD..." />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Languages Spoken (comma separated)">
              <AppInput value={form.languages_spoken} onChange={e => f('languages_spoken', e.target.value)} placeholder="Urdu, English, Hindi" />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Bio">
              <AppTextarea value={form.bio} onChange={e => f('bio', e.target.value)} placeholder="Short bio..." rows={3} />
            </FormField>
          </div>
        </div>
      </AppModal>

      {/* Delete Confirm Modal */}
      <AppModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Doctor"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</AppBtn>
            <AppBtn variant="danger" onClick={() => deleteConfirm && deleteDoctor(deleteConfirm)}>Delete</AppBtn>
          </>
        }>
        <p style={{ color: 'var(--txt2)' }}>
          Are you sure you want to delete this doctor? This action cannot be undone.
        </p>
      </AppModal>
    </div>
  )
}
