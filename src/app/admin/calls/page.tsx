/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb as createClient } from '@/lib/db'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import StatusBadge from '@/components/ui/StatusBadge'

export default async function AdminCallsPage() {
  const supabase = createClient()

  const { data: rawCalls } = await supabase
    .from('calls')
    .select('*, clinics(name), patients(full_name)')
    .order('created_at', { ascending: false })
    .limit(100)
  const calls = rawCalls ?? []

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="All AI Calls" subtitle={`${calls.length} recent calls`} />
      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="Call Log" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date & Time', 'Phone', 'Clinic', 'Patient', 'Type', 'Duration', 'Outcome'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(calls || []).map((call: any, i: number) => (
                <tr key={call.id} className="group">
                  <td className="px-4 py-3 text-xs group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)', fontFamily: 'monospace' }}>
                    {call.phone_number}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {call.clinics?.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {call.patients?.full_name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={call.call_type} />
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '—'}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < calls.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    {call.outcome ? <StatusBadge variant={call.outcome} /> : <span style={{ color: 'var(--txt3)' }}>—</span>}
                  </td>
                </tr>
              ))}
              {(calls.length === 0) && (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">📞</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No calls recorded yet</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>
    </div>
  )
}
