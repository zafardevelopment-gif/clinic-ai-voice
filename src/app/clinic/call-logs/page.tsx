'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import StatusBadge from '@/components/ui/StatusBadge'
import AppModal from '@/components/ui/AppModal'
import ConversationView from '@/components/voice/ConversationView'

interface CallRow {
  id: string
  phone_number: string
  call_type: string
  intent: string | null
  duration_seconds: number | null
  outcome: string | null
  summary: string | null
  created_at: string
  patients: { full_name: string } | null
}

export default function CallLogsPage() {
  const supabase = createClient()
  const [calls, setCalls] = useState<CallRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedCall, setSelectedCall] = useState<CallRow | null>(null)

  useEffect(() => {
    async function load() {
      const me = await fetch('/api/auth/me').then(r => r.ok ? r.json() : null)
      const cid = me?.clinicId
      if (cid) {
        const { data } = await supabase
          .from('calls')
          .select('*, patients(full_name)')
          .eq('clinic_id', cid)
          .order('created_at', { ascending: false })
          .limit(200)
        setCalls(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filters = [
    { label: 'All', value: 'all' },
    { label: '✅ Booked', value: 'booked' },
    { label: '❓ Query', value: 'query' },
    { label: '📵 Missed', value: 'missed' },
    { label: '🔄 Follow-Up', value: 'followup' },
  ]

  const filtered = calls.filter(c => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'booked' && c.outcome === 'booked') ||
      (filter === 'query' && c.call_type === 'query') ||
      (filter === 'missed' && !c.outcome) ||
      (filter === 'followup' && c.call_type === 'followup')
    const matchesSearch = !search ||
      c.phone_number.includes(search) ||
      (c.patients?.full_name || '').toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Call Logs" subtitle={`${calls.length} total AI calls`} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          {/* Filter pills */}
          <div className="flex gap-1.5">
            {filters.map(f => (
              <button key={f.value} onClick={() => setFilter(f.value)}
                className="px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background: filter === f.value ? 'var(--acc-dim)' : 'var(--s3)',
                  border: `1px solid ${filter === f.value ? 'var(--acc)' : 'var(--b2)'}`,
                  color: filter === f.value ? 'var(--acc)' : 'var(--txt2)',
                  cursor: 'pointer',
                }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: 'var(--s1)', border: '1px solid var(--b2)' }}>
            <span style={{ color: 'var(--txt3)', fontSize: 13 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search phone or patient..."
              className="bg-transparent outline-none text-sm" style={{ color: 'var(--txt)', width: 220 }} />
          </div>
        </div>

        <PageCard title="Call History" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date & Time', 'Phone', 'Patient', 'Intent', 'Duration', 'Summary', 'Outcome', ''].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((call, i) => (
                <tr key={call.id} className="group">
                  <td className="px-4 py-3 text-xs group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)', fontFamily: 'monospace' }}>
                    {call.phone_number}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {call.patients?.full_name || <span style={{ color: 'var(--txt3)' }}>Unknown</span>}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={call.call_type} label={call.intent || call.call_type} />
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)', maxWidth: 200 }}>
                    <span className="line-clamp-2">{call.summary || '—'}</span>
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    {call.outcome ? <StatusBadge variant={call.outcome} /> : <span style={{ color: 'var(--txt3)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <button onClick={() => setSelectedCall(call)}
                      className="h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'var(--violet-dim)', border: '1px solid rgba(155,109,255,0.2)', color: 'var(--violet)', cursor: 'pointer' }}>
                      View Chat
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">📞</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No calls match this filter</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>

      {/* Conversation Modal */}
      {selectedCall && (
        <AppModal open={!!selectedCall} onClose={() => setSelectedCall(null)} title="Conversation Transcript" size="lg">
          <ConversationView callId={selectedCall.id} callMeta={{
            phone: selectedCall.phone_number,
            patient: selectedCall.patients?.full_name,
            type: selectedCall.call_type,
            outcome: selectedCall.outcome,
            duration: selectedCall.duration_seconds,
            date: selectedCall.created_at,
          }} />
        </AppModal>
      )}
    </div>
  )
}
