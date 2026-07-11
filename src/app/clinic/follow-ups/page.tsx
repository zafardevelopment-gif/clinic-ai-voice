'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable from '@/components/ui/DataTable'

interface PendingPlan {
  id: string
  patient_id: string
  follow_up_date: string
  reminder_frequency: string
  status: string
  patients: { full_name: string; phone: string | null } | null
}

interface Alert {
  id: string
  follow_up_plan_id: string
  patient_id: string
  alert_type: string
  status: string
  created_at: string
  patients: { full_name: string; phone: string | null } | null
}

type Tab = 'pending' | 'at_risk' | 'callbacks'

export default function FollowUpDashboardPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [pending, setPending] = useState<PendingPlan[]>([])
  const [atRisk, setAtRisk] = useState<Alert[]>([])
  const [callbacks, setCallbacks] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/clinic/adherence/dashboard')
    const data = await res.json()
    setPending(data.pendingFollowUps || [])
    setAtRisk(data.atRiskPatients || [])
    setCallbacks(data.callbackRequests || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function resolveAlert(id: string) {
    await fetch(`/api/clinic/adherence/alerts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
    load()
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Follow-ups"
        subtitle="Medicine adherence & post-visit follow-up tracking"
        actions={<Link href="/clinic/follow-ups/new"><AppBtn icon="+">New Follow-up Plan</AppBtn></Link>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-1.5 mb-4">
          {([
            ['pending', `Pending Follow-ups (${pending.length})`],
            ['at_risk', `Adherence Risk (${atRisk.length})`],
            ['callbacks', `Callback Requests (${callbacks.length})`],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: tab === key ? 'var(--acc-dim)' : 'var(--s3)',
                border: `1px solid ${tab === key ? 'var(--acc)' : 'var(--b2)'}`,
                color: tab === key ? 'var(--acc)' : 'var(--txt2)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <PageCard noPad>
          {loading ? (
            <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
          ) : tab === 'pending' ? (
            <DataTable<PendingPlan>
              emptyMessage="No pending follow-ups"
              emptyIcon="💊"
              columns={[
                { key: 'patient', header: 'Patient', render: (r) => (
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{r.patients?.full_name || '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{r.patients?.phone}</div>
                  </div>
                ) },
                { key: 'follow_up_date', header: 'Follow-up Date' },
                { key: 'reminder_frequency', header: 'Reminder Frequency' },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge variant="active" label={r.status} /> },
              ]}
              data={pending}
            />
          ) : tab === 'at_risk' ? (
            <DataTable<Alert>
              emptyMessage="No adherence risk patients"
              emptyIcon="⚠️"
              columns={[
                { key: 'patient', header: 'Patient', render: (r) => (
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{r.patients?.full_name || '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{r.patients?.phone}</div>
                  </div>
                ) },
                { key: 'alert_type', header: 'Alert', render: (r) => <StatusBadge variant={r.alert_type === 'side_effects' ? 'at_risk' : 'at_risk'} label={r.alert_type.replace(/_/g, ' ')} /> },
                { key: 'created_at', header: 'Raised', render: (r) => new Date(r.created_at).toLocaleString() },
                { key: 'actions', header: '', render: (r) => <AppBtn variant="secondary" size="sm" onClick={() => resolveAlert(r.id)}>Resolve</AppBtn> },
              ]}
              data={atRisk}
            />
          ) : (
            <DataTable<Alert>
              emptyMessage="No callback requests"
              emptyIcon="📞"
              columns={[
                { key: 'patient', header: 'Patient', render: (r) => (
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{r.patients?.full_name || '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{r.patients?.phone}</div>
                  </div>
                ) },
                { key: 'created_at', header: 'Requested', render: (r) => new Date(r.created_at).toLocaleString() },
                { key: 'actions', header: '', render: (r) => <AppBtn variant="secondary" size="sm" onClick={() => resolveAlert(r.id)}>Mark Called</AppBtn> },
              ]}
              data={callbacks}
            />
          )}
        </PageCard>
      </div>
    </div>
  )
}
