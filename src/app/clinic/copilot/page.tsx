'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import DataTable from '@/components/ui/DataTable'

interface CopilotRow {
  id: string
  status: string
  created_at: string
  patients: { full_name: string; phone: string | null } | null
  triage_results: Array<{ id: string; finalized_at: string | null; doctor_final_diagnosis: string | null }>
}

export default function CopilotListPage() {
  const [rows, setRows] = useState<CopilotRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clinic/copilot')
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="AI Clinical Co-Pilot"
        subtitle="Live doctor-run consultations with AI-assisted suggestions"
        actions={<Link href="/clinic/copilot/new"><AppBtn icon="+">New Consultation</AppBtn></Link>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <PageCard noPad>
          {loading ? (
            <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
          ) : (
            <DataTable<CopilotRow>
              emptyMessage="No co-pilot sessions yet"
              emptyIcon="🩺"
              columns={[
                { key: 'patient', header: 'Patient', render: r => (
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{r.patients?.full_name || 'Not registered'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{r.patients?.phone}</div>
                  </div>
                ) },
                { key: 'diagnosis', header: 'Final Diagnosis', render: r => r.triage_results[0]?.doctor_final_diagnosis || '—' },
                { key: 'status', header: 'Status', render: r => r.triage_results[0]?.finalized_at ? 'Finalized' : 'In Progress' },
                { key: 'created_at', header: 'Started', render: r => new Date(r.created_at).toLocaleString() },
                { key: 'actions', header: '', render: r => (
                  <Link href={`/clinic/copilot/${r.id}`}><AppBtn variant="secondary" size="sm">Open</AppBtn></Link>
                ) },
              ]}
              data={rows}
            />
          )}
        </PageCard>
      </div>
    </div>
  )
}
