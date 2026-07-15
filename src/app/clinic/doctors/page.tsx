'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import MediaUpload from '@/components/ui/MediaUpload'
import type { Doctor, Department } from '@/types/database'

interface DoctorWithDept extends Doctor {
  departments?: { name: string } | null
  login_email?: string | null
}

const EMPTY_FORM = {
  full_name: '', specialization: '', phone: '', email: '', bio: '',
  department_id: '', booking_min_hours: 2, booking_max_days: 30,
  slot_duration_minutes: 30, years_of_experience: '', qualifications: '',
  consultation_fee: '', languages_spoken: '', avatar_url: '',
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

  const [loginDoctor, setLoginDoctor] = useState<DoctorWithDept | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginSaving, setLoginSaving] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginResult, setLoginResult] = useState<{ email: string; temporaryPassword?: string } | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<DoctorWithDept | null>(null)

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
      avatar_url: doc.avatar_url || '',
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
      avatar_url: form.avatar_url || null,
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

  function openLogin(doc: DoctorWithDept, resetMode: boolean) {
    setLoginDoctor(doc)
    setLoginEmail(doc.login_email || doc.email || '')
    setLoginPassword('')
    setLoginError('')
    setLoginResult(null)
    setLoginResetMode(resetMode)
  }

  const [loginResetMode, setLoginResetMode] = useState(false)

  async function submitLogin() {
    if (!loginDoctor) return
    setLoginSaving(true)
    setLoginError('')
    try {
      const res = await fetch(`/api/clinic/doctors/${loginDoctor.id}/login`, {
        method: loginResetMode ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginResetMode ? undefined : loginEmail,
          password: loginPassword || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setLoginError(data.error || 'Failed'); setLoginSaving(false); return }
      setLoginResult({ email: data.email, temporaryPassword: data.temporaryPassword })
      if (!loginResetMode) {
        setDoctors(prev => prev.map(d => d.id === loginDoctor.id ? { ...d, login_email: data.email } : d))
      }
    } finally {
      setLoginSaving(false)
    }
  }

  async function revokeLogin(doc: DoctorWithDept) {
    const res = await fetch(`/api/clinic/doctors/${doc.id}/login`, { method: 'DELETE' })
    if (res.ok) {
      setDoctors(prev => prev.map(d => d.id === doc.id ? { ...d, login_email: null } : d))
    }
    setRevokeConfirm(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Doctors" subtitle={`${doctors.length} registered`}
        actions={<AppBtn icon="+" onClick={openNew}>Add Doctor</AppBtn>} />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="Medical Staff" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Doctor', 'Department', 'Phone', 'Fee', 'Slot', 'Status', 'Login', 'Actions'].map(h => (
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
                        <div
                          className="rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ width: 36, height: 36, background: 'var(--acc-dim)', color: 'var(--acc)' }}
                        >
                          {doc.full_name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{doc.full_name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>
                          {doc.specialization || '—'}
                          {doc.years_of_experience ? ` · ${doc.years_of_experience}yr exp` : ''}
                        </div>
                      </div>
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
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {doc.login_email ? (
                      <span title={doc.login_email} style={{ color: 'var(--acc)' }}>● Active</span>
                    ) : (
                      <span style={{ color: 'var(--txt3)' }}>— None —</span>
                    )}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < doctors.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="flex gap-2 flex-wrap">
                      <AppBtn variant="secondary" size="sm" onClick={() => openEdit(doc)}>Edit</AppBtn>
                      {doc.login_email ? (
                        <>
                          <AppBtn variant="secondary" size="sm" onClick={() => openLogin(doc, true)}>Reset Password</AppBtn>
                          <AppBtn variant="danger" size="sm" onClick={() => setRevokeConfirm(doc)}>Revoke Login</AppBtn>
                        </>
                      ) : (
                        <AppBtn variant="secondary" size="sm" onClick={() => openLogin(doc, false)}>Create Login</AppBtn>
                      )}
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
            <FormField label="Photo" hint="Upload a photo, or paste a direct image link">
              <MediaUpload
                value={form.avatar_url}
                onChange={url => f('avatar_url', url)}
                accept="image/*"
                uploadEndpoint="/api/clinic/doctors/upload"
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

      {/* Create / Reset Login Modal */}
      <AppModal
        open={!!loginDoctor}
        onClose={() => setLoginDoctor(null)}
        title={loginResetMode ? `Reset Password — ${loginDoctor?.full_name || ''}` : `Create Login — ${loginDoctor?.full_name || ''}`}
        footer={
          loginResult ? (
            <AppBtn onClick={() => setLoginDoctor(null)}>Done</AppBtn>
          ) : (
            <>
              <AppBtn variant="secondary" onClick={() => setLoginDoctor(null)}>Cancel</AppBtn>
              <AppBtn
                onClick={submitLogin}
                disabled={loginSaving || (!loginResetMode && !loginEmail.trim())}
              >
                {loginSaving ? 'Saving...' : loginResetMode ? 'Reset Password' : 'Create Login'}
              </AppBtn>
            </>
          )
        }
      >
        {loginResult ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--acc-dim)', color: 'var(--acc)', border: '1px solid rgba(16,185,129,0.2)' }}>
              Login {loginResetMode ? 'password reset' : 'created'} successfully.
            </div>
            <FormField label="Email">
              <AppInput value={loginResult.email} readOnly />
            </FormField>
            {loginResult.temporaryPassword && (
              <FormField label="Temporary Password" hint="Share this with the doctor now — it will not be shown again.">
                <AppInput value={loginResult.temporaryPassword} readOnly style={{ fontFamily: 'monospace' }} />
              </FormField>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {loginError && (
              <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
                {loginError}
              </div>
            )}
            {!loginResetMode && (
              <FormField label="Login Email" required hint="Doctor will use this to sign in at /login">
                <AppInput type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="doctor@clinic.com" />
              </FormField>
            )}
            <FormField label="Password" hint="Leave blank to auto-generate a temporary password">
              <AppInput type="text" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
            </FormField>
          </div>
        )}
      </AppModal>

      {/* Revoke Login Confirm Modal */}
      <AppModal open={!!revokeConfirm} onClose={() => setRevokeConfirm(null)} title="Revoke Login"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setRevokeConfirm(null)}>Cancel</AppBtn>
            <AppBtn variant="danger" onClick={() => revokeConfirm && revokeLogin(revokeConfirm)}>Revoke</AppBtn>
          </>
        }>
        <p style={{ color: 'var(--txt2)' }}>
          This will permanently delete {revokeConfirm?.full_name}&apos;s login account. They will no longer be able to sign in. This action cannot be undone.
        </p>
      </AppModal>
    </div>
  )
}
