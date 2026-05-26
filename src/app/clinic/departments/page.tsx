'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, AppInput, AppTextarea } from '@/components/ui/FormField'
import type { Department } from '@/types/database'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    fetch('/api/clinic/departments')
      .then(r => r.json())
      .then(d => setDepartments(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  function openNew() { setForm({ name: '', description: '' }); setEditId(null); setSaveError(''); setOpen(true) }
  function openEdit(dept: Department) { setForm({ name: dept.name, description: dept.description || '' }); setEditId(dept.id); setSaveError(''); setOpen(true) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      if (editId) {
        const res = await fetch(`/api/clinic/departments/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, description: form.description || null }),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); setSaving(false); return }
        setDepartments(prev => prev.map(d => d.id === editId ? data : d))
      } else {
        const res = await fetch('/api/clinic/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, description: form.description || null }),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Save failed'); setSaving(false); return }
        setDepartments(prev => [...prev, data])
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(dept: Department) {
    const res = await fetch(`/api/clinic/departments/${dept.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !dept.is_active }),
    })
    if (res.ok) {
      setDepartments(prev => prev.map(d => d.id === dept.id ? { ...d, is_active: !d.is_active } : d))
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Departments" subtitle={`${departments.length} total`}
        actions={<AppBtn icon="+" onClick={openNew}>Add Department</AppBtn>} />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="All Departments" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Department', 'Description', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((dept, i) => (
                <tr key={dept.id} className="group">
                  <td className="px-4 py-3 text-sm font-semibold group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < departments.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)' }}>
                    {dept.name}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < departments.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {dept.description || '—'}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < departments.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={dept.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < departments.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="flex gap-2">
                      <AppBtn variant="secondary" size="sm" onClick={() => openEdit(dept)}>Edit</AppBtn>
                      <AppBtn variant={dept.is_active ? 'danger' : 'secondary'} size="sm" onClick={() => toggleActive(dept)}>
                        {dept.is_active ? 'Disable' : 'Enable'}
                      </AppBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && departments.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">🏥</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No departments yet</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>

      <AppModal open={open} onClose={() => setOpen(false)} title={editId ? 'Edit Department' : 'Add Department'}
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setOpen(false)}>Cancel</AppBtn>
            <AppBtn onClick={save} disabled={saving || !form.name.trim()}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</AppBtn>
          </>
        }>
        <div className="space-y-4">
          {saveError && (
            <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
              {saveError}
            </div>
          )}
          <FormField label="Name" required>
            <AppInput value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Cardiology" required />
          </FormField>
          <FormField label="Description">
            <AppTextarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description..." rows={3} />
          </FormField>
        </div>
      </AppModal>
    </div>
  )
}
