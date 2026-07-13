'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import MediaUpload from '@/components/ui/MediaUpload'
import type { Doctor } from '@/types/database'

interface AdminDoctor extends Doctor {
  clinics?: { name: string } | null
  departments?: { name: string } | null
  login: { id: string; email: string; is_active: boolean; last_login: string | null } | null
}

interface ClinicOption { id: string; name: string }

const EMPTY_FORM = {
  clinic_id: '', full_name: '', specialization: '', phone: '', email: '', bio: '',
  years_of_experience: '', qualifications: '', consultation_fee: '', languages_spoken: '', avatar_url: '',
}

export default function AdminDoctorsPage() {
  const [doctors, setDoctors] = useState<AdminDoctor[]>([])
  const [clinics, setClinics] = useState<ClinicOption[]>([])
  const [clinicFilter, setClinicFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [createLogin, setCreateLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const [credentialModal, setCredentialModal] = useState<{ email: string; password: string; created: boolean } | null>(null)
  const [resetTarget, setResetTarget] = useState<AdminDoctor | null>(null)
  const [resetEmail, setResetEmail] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch('/api/admin/clinics').then(r => r.json()).then(d => setClinics(Array.isArray(d) ? d : []))
  }, [])

  async function load() {
    setLoading(true)
    const url = clinicFilter ? `/api/admin/doctors?clinic_id=${clinicFilter}` : '/api/admin/doctors'
    const data = await fetch(url).then(r => r.json())
    setDoctors(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [clinicFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  function openNew() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setCreateLogin(false)
    setLoginEmail('')
    setLoginPassword('')
    setSaveError('')
    setOpen(true)
  }

  function openEdit(doc: AdminDoctor) {
    setForm({
      clinic_id: doc.clinic_id,
      full_name: doc.full_name,
      specialization: doc.specialization || '',
      phone: doc.phone || '',
      email: doc.email || '',
      bio: doc.bio || '',
      years_of_experience: doc.years_of_experience != null ? String(doc.years_of_experience) : '',
      qualifications: doc.qualifications || '',
      consultation_fee: doc.consultation_fee != null ? String(doc.consultation_fee) : '',
      languages_spoken: doc.languages_spoken ? doc.languages_spoken.join(', ') : '',
      avatar_url: doc.avatar_url || '',
    })
    setEditId(doc.id)
    setSaveError('')
    setOpen(true)
  }

  const f = (k: keyof typeof EMPTY_FORM, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    if (!form.full_name.trim()) return
    if (!editId && !form.clinic_id) { setSaveError('Select a clinic'); return }
    setSaving(true)
    setSaveError('')

    const payload: Record<string, unknown> = {
      full_name: form.full_name,
      specialization: form.specialization || null,
      phone: form.phone || null,
      email: form.email || null,
      bio: form.bio || null,
      years_of_experience: form.years_of_experience ? Number(form.years_of_experience) : null,
      qualifications: form.qualifications || null,
      consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : null,
      languages_spoken: form.languages_spoken ? form.languages_spoken.split(',').map(s => s.trim()).filter(Boolean) : null,
      avatar_url: form.avatar_url || null,
    }

    try {
      if (editId) {
        const res = await fetch(`/api/admin/doctors/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); setSaving(false); return }
        setDoctors(prev => prev.map(d => (d.id === editId ? { ...d, ...data } : d)))
      } else {
        const res = await fetch('/api/admin/doctors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            clinic_id: form.clinic_id,
            create_login: createLogin,
            login_email: loginEmail || undefined,
            login_password: loginPassword || undefined,
          }),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); setSaving(false); return }
        if (data.login) {
          setCredentialModal({ email: data.login.email, password: loginPassword, created: true })
        }
        load()
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteDoctor(id: string) {
    const res = await fetch(`/api/admin/doctors/${id}`, { method: 'DELETE' })
    if (res.ok) setDoctors(prev => prev.filter(d => d.id !== id))
    setDeleteConfirm(null)
  }

  function openReset(doc: AdminDoctor) {
    setResetTarget(doc)
    setResetEmail(doc.login?.email || doc.email || '')
    setResetError('')
  }

  async function submitReset() {
    if (!resetTarget) return
    setResetting(true)
    setResetError('')
    try {
      const res = await fetch(`/api/admin/doctors/${resetTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetTarget.login ? undefined : resetEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setResetError(data.error || 'Failed'); return }
      setCredentialModal({ email: data.email, password: data.password, created: data.created })
      setResetTarget(null)
      load()
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Doctors"
        subtitle={`${doctors.length} across all clinics`}
        actions={
          <div className="flex gap-2 items-center">
            <AppSelect value={clinicFilter} onChange={e => setClinicFilter(e.target.value)} style={{ width: 220 }}>
              <option value="">All Clinics</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </AppSelect>
            <AppBtn icon="+" onClick={openNew}>Add Doctor</AppBtn>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="Medical Staff" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Doctor', 'Clinic', 'Department', 'Login (User ID)', 'Status', 'Actions'].map(h => (
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
                    <div className="flex items-center gap-3">
                      {doc.avatar_url ? (
                        <img
                          src={doc.avatar_url}
                          alt={doc.full_name}
                          className="rounded-full object-cover flex-shrink-0"
                          style={{ width: 36, height: 36, border: '1px solid var(--b1)' }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <div className="rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ width: 36, height: 36, background: 'var(--acc-dim)', color: 'var(--acc)' }}>
                          {doc.full_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{doc.full_name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{doc.specialization || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {doc.clinics?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {doc.departments?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)', fontFamily: 'monospace' }}>
                    {doc.login?.email || <span style={{ color: 'var(--txt3)', fontFamily: 'inherit' }}>No login</span>}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={doc.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="flex gap-2">
                      <AppBtn variant="secondary" size="sm" onClick={() => openEdit(doc)}>Edit</AppBtn>
                      <AppBtn variant="secondary" size="sm" onClick={() => openReset(doc)}>
                        {doc.login ? 'Reset Password' : 'Create Login'}
                      </AppBtn>
                      <AppBtn variant="danger" size="sm" onClick={() => setDeleteConfirm(doc.id)}>Delete</AppBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && doctors.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">👨‍⚕️</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No doctors found</p>
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
          {!editId && (
            <div className="col-span-2">
              <FormField label="Clinic" required>
                <AppSelect value={form.clinic_id} onChange={e => f('clinic_id', e.target.value)}>
                  <option value="">— Select Clinic —</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AppSelect>
              </FormField>
            </div>
          )}
          <FormField label="Full Name" required>
            <AppInput value={form.full_name} onChange={e => f('full_name', e.target.value)} placeholder="Dr. Ahmed Khan" required />
          </FormField>
          <FormField label="Specialization">
            <AppInput value={form.specialization} onChange={e => f('specialization', e.target.value)} placeholder="Cardiologist" />
          </FormField>
          <FormField label="Years of Experience">
            <AppInput type="number" min={0} max={60} value={form.years_of_experience} onChange={e => f('years_of_experience', e.target.value)} placeholder="e.g. 10" />
          </FormField>
          <FormField label="Phone">
            <AppInput value={form.phone} onChange={e => f('phone', e.target.value)} placeholder="+91 300 0000000" />
          </FormField>
          <FormField label="Email (contact)">
            <AppInput type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="doctor@clinic.com" />
          </FormField>
          <FormField label="Consultation Fee (Rs)">
            <AppInput type="number" min={0} value={form.consultation_fee} onChange={e => f('consultation_fee', e.target.value)} placeholder="e.g. 1500" />
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
            <FormField label="Photo" hint="Upload a photo, or paste a direct image link">
              <MediaUpload
                value={form.avatar_url}
                onChange={url => f('avatar_url', url)}
                accept="image/*"
                uploadEndpoint="/api/admin/doctors/upload"
                previewType="image"
                placeholder="https://example.com/doctor-photo.jpg"
              />
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Bio">
              <AppTextarea value={form.bio} onChange={e => f('bio', e.target.value)} placeholder="Short bio..." rows={3} />
            </FormField>
          </div>

          {!editId && (
            <div className="col-span-2 rounded-xl p-4" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={createLogin} onChange={e => setCreateLogin(e.target.checked)} />
                <span className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>Create a login for this doctor</span>
              </label>
              {createLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Login Email" required>
                    <AppInput type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="doctor@login.com" />
                  </FormField>
                  <FormField label="Password" hint="Min 8 characters — leave blank to auto-generate">
                    <AppInput type="text" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Auto-generated if blank" />
                  </FormField>
                </div>
              )}
            </div>
          )}
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
          Are you sure you want to delete this doctor? This also removes their login, if any. This action cannot be undone.
        </p>
      </AppModal>

      {/* Reset/Create Login Modal */}
      <AppModal open={!!resetTarget} onClose={() => setResetTarget(null)} title={resetTarget?.login ? 'Reset Password' : 'Create Login'}
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setResetTarget(null)}>Cancel</AppBtn>
            <AppBtn onClick={submitReset} disabled={resetting || (!resetTarget?.login && !resetEmail.trim())}>
              {resetting ? 'Working...' : resetTarget?.login ? 'Reset Password' : 'Create Login'}
            </AppBtn>
          </>
        }>
        <div className="space-y-3">
          {resetError && (
            <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{resetError}</div>
          )}
          <p style={{ color: 'var(--txt2)' }} className="text-sm">
            {resetTarget?.login
              ? `A new password will be generated for ${resetTarget.login.email}. It will be shown once — save it before closing.`
              : 'This doctor has no login yet. Enter the email to use — a password will be generated and shown once.'}
          </p>
          {!resetTarget?.login && (
            <FormField label="Login Email" required>
              <AppInput type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="doctor@login.com" />
            </FormField>
          )}
        </div>
      </AppModal>

      {/* Show-once credentials modal */}
      <AppModal open={!!credentialModal} onClose={() => setCredentialModal(null)} title="Login Credentials"
        footer={<AppBtn onClick={() => setCredentialModal(null)}>Done</AppBtn>}>
        <div className="space-y-3">
          <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
            This password is shown only once. Copy it now — it cannot be retrieved later.
          </div>
          <div className="rounded-xl p-4 space-y-2" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
            <div>
              <div className="text-[11px] uppercase tracking-[0.6px]" style={{ color: 'var(--txt3)' }}>User ID (Email)</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--txt)', fontFamily: 'monospace' }}>{credentialModal?.email}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.6px]" style={{ color: 'var(--txt3)' }}>Password</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--txt)', fontFamily: 'monospace' }}>{credentialModal?.password}</div>
            </div>
          </div>
        </div>
      </AppModal>
    </div>
  )
}
