/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import PageCard from '@/components/ui/PageCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'

export default async function AIDashboardPage() {
  const session = await getSession()
  const supabase = getDb()

  const clinicId = session?.clinicId
  if (!clinicId) {
    return <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--txt2)' }}>No clinic assigned</div>
  }

  const todayStart = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'

  const [
    { count: callsToday },
    { count: bookedToday },
    { count: missedToday },
    { count: totalCalls },
    { count: totalBooked },
    { data: recentCalls },
    { data: voiceConfigRow },
  ] = await Promise.all([
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', todayStart),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('outcome', 'booked').gte('created_at', todayStart),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).is('outcome', null).gte('created_at', todayStart),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('outcome', 'booked'),
    supabase.from('calls').select('*, patients(full_name)').eq('clinic_id', clinicId).order('created_at', { ascending: false }).limit(10),
    supabase.from('voice_agent_config').select('*').eq('clinic_id', clinicId).single(),
  ])

  const conversionToday = callsToday ? Math.round(((bookedToday ?? 0) / callsToday) * 100) : 0
  const conversionAll = totalCalls ? Math.round(((totalBooked ?? 0) / totalCalls) * 100) : 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="AI Voice Dashboard"
        subtitle="Real-time overview of your AI voice agent"
        actions={
          <div className="flex items-center gap-2">
            {voiceConfigRow?.is_enabled ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', color: 'var(--teal)' }}>
                <span className="w-2 h-2 rounded-full animate-livePulse" style={{ background: 'var(--teal)' }} />
                LIVE
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: 'var(--rose-dim)', border: '1px solid rgba(255,78,106,0.25)', color: 'var(--rose)' }}>
                <span className="w-2 h-2 rounded-full" style={{ background: 'var(--rose)' }} />
                OFFLINE
              </div>
            )}
            <Link href="/clinic/voice-config">
              <button className="h-9 px-4 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--s3)', border: '1px solid var(--b2)', color: 'var(--txt)', cursor: 'pointer' }}>
                ⚙️ Configure
              </button>
            </Link>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Today stats */}
        <div className="mb-2">
          <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: 'var(--txt3)' }}>TODAY</p>
          <div className="grid grid-cols-4 gap-3.5">
            <StatCard icon="📞" label="Calls Today"          value={callsToday ?? 0}       color="blue" delta="Live" deltaType="up" />
            <StatCard icon="✅" label="Booked via AI"        value={bookedToday ?? 0}       color="teal" />
            <StatCard icon="📵" label="Missed / Unanswered"  value={missedToday ?? 0}       color="rose" />
            <StatCard icon="🎯" label="Conversion Rate"      value={`${conversionToday}%`}  color="amber" />
          </div>
        </div>

        {/* All-time stats */}
        <div className="mb-5">
          <p className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: 'var(--txt3)' }}>ALL TIME</p>
          <div className="grid grid-cols-3 gap-3.5">
            <StatCard icon="📊" label="Total AI Calls"       value={totalCalls ?? 0}        color="violet" />
            <StatCard icon="📋" label="Total Booked via AI"  value={totalBooked ?? 0}       color="teal" />
            <StatCard icon="📈" label="Overall Conversion"   value={`${conversionAll}%`}    color="blue" />
          </div>
        </div>

        {/* Recent Call Activity */}
        <PageCard title="Recent Call Activity" subtitle="Latest AI interactions" noPad
          actions={<Link href="/clinic/call-logs" className="text-[12px] font-semibold" style={{ color: 'var(--acc)' }}>View All Logs →</Link>}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date & Time', 'Phone', 'Patient', 'Call Type', 'Duration', 'Outcome'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentCalls || []).map((call: any, i: number) => (
                <tr key={call.id} className="group">
                  <td className="px-4 py-3 text-xs group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {new Date(call.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)', fontFamily: 'monospace' }}>
                    {call.phone_number}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {call.patients?.full_name || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={call.call_type} />
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '—'}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    {call.outcome ? <StatusBadge variant={call.outcome} /> : <span style={{ color: 'var(--txt3)' }}>—</span>}
                  </td>
                </tr>
              ))}
              {(!recentCalls || recentCalls.length === 0) && (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">🤖</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No AI calls recorded yet</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>
    </div>
  )
}
