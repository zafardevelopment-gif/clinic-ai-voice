'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, AppInput, AppSelect } from '@/components/ui/FormField'

interface UserRow {
  id: string
  email: string
  full_name: string | null
  role: string
  clinic_id: string | null
  is_active: boolean
  created_at: string
  clinics?: { name: string } | null
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserRow[]>([])
  const [clinics, setClinics] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'clinic_admin', clinic_id: '', password: '' })

  useEffect(() => {
    async function load() {
      const [{ data: usersData }, { data: clinicData }] = await Promise.all([
        supabase.from('users').select('id, email, full_name, role, clinic_id, is_active, created_at').order('created_at', { ascending: false }),
        supabase.from('clinics').select('id, name').eq('is_active', true).order('name'),
      ])
      const clinicMap = Object.fromEntries((clinicData || []).map(c => [c.id, c.name]))
      const enriched: UserRow[] = (usersData || []).map(u => ({
        ...u,
        clinics: u.clinic_id ? { name: clinicMap[u.clinic_id] || '—' } : null,
      }))
      setUsers(enriched)
      setClinics(clinicData || [])
      setLoading(false)
    }
    load()
  }, [])

  async function inviteUser() {
    setSaving(true)
    // In production: use Supabase Admin API or send invite email
    // For now we use signUp with service role (call a server action)
    const res = await fetch('/api/admin/invite-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      const { data: usersData } = await supabase.from('users').select('id, email, full_name, role, clinic_id, is_active, created_at').order('created_at', { ascending: false })
      const clinicMap = Object.fromEntries(clinics.map(c => [c.id, c.name]))
      const enriched: UserRow[] = (usersData || []).map(u => ({
        ...u,
        clinics: u.clinic_id ? { name: clinicMap[u.clinic_id] || '—' } : null,
      }))
      setUsers(enriched)
      setOpen(false)
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Users" subtitle={`${users.length} registered`}
        actions={<AppBtn icon="+" onClick={() => setOpen(true)}>Invite User</AppBtn>} />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="All Users" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name / Email', 'Role', 'Clinic', 'Joined', 'Status'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} className="group">
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{user.full_name || '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{user.email}</div>
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize"
                      style={{
                        background: user.role === 'admin' ? 'var(--acc-dim)' : 'var(--teal-dim)',
                        color: user.role === 'admin' ? 'var(--acc)' : 'var(--teal)',
                      }}>
                      {user.role === 'admin' ? '⚡ Admin' : '🏥 Clinic Admin'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {user.clinics?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt3)' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < users.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={user.is_active ? 'active' : 'inactive'} />
                  </td>
                </tr>
              ))}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">👥</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No users found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>

      <AppModal open={open} onClose={() => setOpen(false)} title="Invite User"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setOpen(false)}>Cancel</AppBtn>
            <AppBtn onClick={inviteUser} disabled={saving}>{saving ? 'Inviting...' : 'Send Invite'}</AppBtn>
          </>
        }>
        <div className="space-y-4">
          <FormField label="Full Name">
            <AppInput value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Dr. Jane Smith" />
          </FormField>
          <FormField label="Email" required>
            <AppInput type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          </FormField>
          <FormField label="Temporary Password" required>
            <AppInput type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
          </FormField>
          <FormField label="Role">
            <AppSelect value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="clinic_admin">Clinic Admin</option>
              <option value="admin">Super Admin</option>
            </AppSelect>
          </FormField>
          {form.role === 'clinic_admin' && (
            <FormField label="Assign Clinic">
              <AppSelect value={form.clinic_id} onChange={e => setForm(f => ({ ...f, clinic_id: e.target.value }))}>
                <option value="">— Select Clinic —</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </AppSelect>
            </FormField>
          )}
        </div>
      </AppModal>
    </div>
  )
}
