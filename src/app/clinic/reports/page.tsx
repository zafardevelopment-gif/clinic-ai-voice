'use client'

import { useMemo, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppSelect } from '@/components/ui/FormField'

/** Build a list of the last 12 months as YYYY-MM strings (IST). */
function recentMonths(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    const value = d.toISOString().slice(0, 7)
    const label = d.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    out.push({ value, label })
  }
  return out
}

export default function ReportsPage() {
  const months = useMemo(recentMonths, [])
  const [month, setMonth] = useState(months[0].value)

  const reportUrl = `/api/clinic/reports/monthly?month=${month}`

  return (
    <>
      <Topbar
        title="Monthly Reports"
        subtitle="Reminder activity, answer rates, and confirmation summary"
      />

      <PageCard title="Generate Report">
        <div className="flex items-end gap-3 flex-wrap">
          <div style={{ minWidth: 220 }}>
            <FormField label="Month">
              <AppSelect value={month} onChange={e => setMonth(e.target.value)}>
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </AppSelect>
            </FormField>
          </div>
          <a href={reportUrl} target="_blank" rel="noreferrer">
            <AppBtn>Open Report (PDF-ready)</AppBtn>
          </a>
          <a href={`${reportUrl}&format=json`} target="_blank" rel="noreferrer">
            <AppBtn variant="secondary">Raw JSON</AppBtn>
          </a>
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--txt3)' }}>
          The report opens in a new tab. Click the &quot;Print / Save as PDF&quot; button at the top,
          then choose &quot;Save as PDF&quot; in your browser&apos;s print dialog. Shareable with patients,
          accountants, or kept for records.
        </p>
      </PageCard>

      <PageCard title="Preview" noPad>
        <iframe
          src={reportUrl}
          style={{
            width: '100%',
            height: 800,
            border: 'none',
            background: '#fff',
            borderRadius: 12,
          }}
        />
      </PageCard>
    </>
  )
}
