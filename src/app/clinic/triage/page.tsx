'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import TriageSummaryPanel from '@/components/clinic/TriageSummaryPanel'

interface TriageRow {
  id: string
  category: string
  summary: string
  doctor_notes: string | null
  is_ai_edited: boolean
  created_at: string
  doctors: { full_name: string } | null
  symptom_triage_sessions: {
    id: string
    source: string
    age_group: string | null
    status: string
    patients: { full_name: string; phone: string | null } | null
  }
}

const CATEGORIES = ['all', 'emergency', 'urgent_same_day', 'routine', 'follow_up']

export default function TriageQueuePage() {
  const [rows, setRows] = useState<TriageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('all')
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const url = category === 'all' ? '/api/clinic/triage' : `/api/clinic/triage?category=${category}`
    const res = await fetch(url)
    const data = await res.json()
    setRows(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [category])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Symptom Triage"
        subtitle="Pre-visit triage queue — guidance only, doctor review recommended"
        actions={<Link href="/clinic/triage/new"><AppBtn icon="+">New Triage Entry</AppBtn></Link>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,180,0,0.2)' }}>
          This is not a diagnosis. Final medical advice must come from a doctor.
        </div>

        <div className="flex gap-1.5 mb-4 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className="px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all"
              style={{
                background: category === c ? 'var(--acc-dim)' : 'var(--s3)',
                border: `1px solid ${category === c ? 'var(--acc)' : 'var(--b2)'}`,
                color: category === c ? 'var(--acc)' : 'var(--txt2)',
                cursor: 'pointer',
              }}
            >
              {c === 'all' ? 'All' : c.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <PageCard noPad>
          {loading ? (
            <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
          ) : (
            <DataTable<TriageRow>
              emptyMessage="No triage sessions yet"
              emptyIcon="🩺"
              columns={[
                { key: 'patient', header: 'Patient', render: (r) => (
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{r.symptom_triage_sessions.patients?.full_name || 'Not registered'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{r.symptom_triage_sessions.patients?.phone}</div>
                  </div>
                ) },
                { key: 'category', header: 'Category', render: (r) => <StatusBadge variant={r.category} /> },
                { key: 'source', header: 'Source', render: (r) => <span className="capitalize text-xs" style={{ color: 'var(--txt2)' }}>{r.symptom_triage_sessions.source.replace('_', ' ')}</span> },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge variant={r.symptom_triage_sessions.status === 'reviewed' ? 'reviewed' : 'pending'} label={r.symptom_triage_sessions.status} /> },
                { key: 'created_at', header: 'Submitted', render: (r) => new Date(r.created_at).toLocaleString() },
                { key: 'actions', header: '', render: (r) => (
                  <AppBtn variant="secondary" size="sm" onClick={() => setOpenSessionId(r.symptom_triage_sessions.id)}>View</AppBtn>
                ) },
              ]}
              data={rows}
            />
          )}
        </PageCard>
      </div>

      {openSessionId && (
        <TriageSummaryPanel sessionId={openSessionId} onClose={() => { setOpenSessionId(null); load() }} />
      )}
    </div>
  )
}
