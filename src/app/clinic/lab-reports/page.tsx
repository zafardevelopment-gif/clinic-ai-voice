'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'

interface ReportRow {
  id: string
  report_date: string | null
  lab_name: string | null
  status: string
  created_at: string
  patients: { full_name: string; phone: string | null } | null
}

export default function LabReportsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clinic/lab-reports').then(r => r.json()).then(d => { setRows(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Lab Reports"
        subtitle="Enter lab values and generate plain-language explanations"
        actions={<Link href="/clinic/lab-reports/new"><AppBtn icon="+">New Lab Report</AppBtn></Link>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <PageCard noPad>
          {loading ? (
            <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
          ) : (
            <DataTable<ReportRow>
              emptyMessage="No lab reports yet"
              emptyIcon="🧪"
              columns={[
                { key: 'patient', header: 'Patient', render: (r) => (
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{r.patients?.full_name || '—'}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{r.patients?.phone}</div>
                  </div>
                ) },
                { key: 'lab_name', header: 'Lab' },
                { key: 'report_date', header: 'Report Date' },
                { key: 'status', header: 'Status', render: (r) => <StatusBadge variant={r.status} /> },
                { key: 'actions', header: '', render: (r) => (
                  <AppBtn variant="secondary" size="sm" onClick={() => router.push(`/clinic/lab-reports/${r.id}`)}>View</AppBtn>
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
