'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'

interface ReminderRow {
  id: string
  type: string
  status: string
  response: string | null
  scheduled_at: string
  placed_at: string | null
  ended_at: string | null
  to_number: string
  duration_seconds: number | null
  dtmf_received: string | null
  attempt: number
  error_message: string | null
  patients?: { full_name: string | null } | null
  appointments?: { appointment_date: string | null; appointment_time: string | null } | null
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  scheduled:   { bg: 'var(--s3)',        fg: 'var(--txt2)' },
  in_progress: { bg: 'var(--amber-dim)', fg: 'var(--amber)' },
  answered:    { bg: 'var(--teal-dim)',  fg: 'var(--teal)' },
  no_answer:   { bg: 'var(--rose-dim)',  fg: 'var(--rose)' },
  busy:        { bg: 'var(--rose-dim)',  fg: 'var(--rose)' },
  failed:      { bg: 'var(--rose-dim)',  fg: 'var(--rose)' },
  cancelled:   { bg: 'var(--s3)',        fg: 'var(--txt3)' },
}

export default function ReminderLogsPage() {
  const [rows, setRows] = useState<ReminderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  async function load() {
    setLoading(true)
    const data: ReminderRow[] = await fetch(
      `/api/clinic/reminders/logs?status=${filterStatus}`,
    ).then(r => (r.ok ? r.json() : []))
    setRows(data || [])
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [filterStatus])

  return (
    <>
      <Topbar
        title="Reminder Logs"
        subtitle="Every reminder call we've planned, placed, or completed for your clinic"
      />

      <PageCard>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Filter:</span>
          {['all', 'scheduled', 'in_progress', 'answered', 'no_answer', 'failed'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-all capitalize"
              style={{
                background: filterStatus === s ? 'var(--acc)' : 'var(--s3)',
                color: filterStatus === s ? '#fff' : 'var(--txt2)',
                border: '1px solid var(--b2)',
                cursor: 'pointer',
              }}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
          <button
            onClick={load}
            className="ml-auto text-xs font-semibold"
            style={{ color: 'var(--acc)', cursor: 'pointer' }}
          >
            Refresh ↻
          </button>
        </div>

        {loading ? (
          <div className="text-sm" style={{ color: 'var(--txt2)' }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--txt3)' }}>
            No reminder calls yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--b1)' }}>
                  <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>When</th>
                  <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Patient</th>
                  <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Type</th>
                  <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Status</th>
                  <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Response</th>
                  <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Duration</th>
                  <th className="text-left py-2 px-2 font-semibold uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Attempt</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.scheduled
                  return (
                    <tr key={r.id} className="group hover:bg-[rgba(16,185,129,0.05)]" style={{ borderBottom: '1px solid var(--b1)' }}>
                      <td className="py-2 px-2" style={{ color: 'var(--txt2)' }}>
                        {new Date(r.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-2 font-medium" style={{ color: 'var(--txt)' }}>
                        {r.patients?.full_name || r.to_number}
                      </td>
                      <td className="py-2 px-2 capitalize" style={{ color: 'var(--txt2)' }}>
                        {r.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                          style={{ background: sc.bg, color: sc.fg }}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-2 capitalize" style={{ color: 'var(--txt2)' }}>
                        {r.response ? r.response.replace('_', ' ') : '—'}
                      </td>
                      <td className="py-2 px-2" style={{ color: 'var(--txt2)' }}>
                        {r.duration_seconds ? `${r.duration_seconds}s` : '—'}
                      </td>
                      <td className="py-2 px-2" style={{ color: 'var(--txt2)' }}>
                        {r.attempt}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>
    </>
  )
}
