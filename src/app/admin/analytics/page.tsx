import { getDb as createClient } from '@/lib/db'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import PageCard from '@/components/ui/PageCard'

export default async function AdminAnalyticsPage() {
  const supabase = createClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalCalls },
    { count: callsThisMonth },
    { count: bookedCalls },
    { count: missedCalls },
    { data: clinicsWithCalls },
  ] = await Promise.all([
    supabase.from('calls').select('*', { count: 'exact', head: true }),
    supabase.from('calls').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('outcome', 'booked'),
    supabase.from('calls').select('*', { count: 'exact', head: true }).is('outcome', null),
    supabase.from('clinics').select(`
      id, name,
      calls(count)
    `).eq('is_active', true),
  ])

  const conversionRate = totalCalls && bookedCalls
    ? Math.round((bookedCalls / totalCalls) * 100) : 0

  type ClinicWithCalls = { id: string; name: string; calls: { count: number }[] }
  const topClinics: ClinicWithCalls[] = (clinicsWithCalls as ClinicWithCalls[] || [])
    .filter(c => (c.calls?.[0]?.count ?? 0) > 0)
    .sort((a, b) => (b.calls?.[0]?.count ?? 0) - (a.calls?.[0]?.count ?? 0))
    .slice(0, 8)

  const maxCalls = topClinics[0]?.calls?.[0]?.count ?? 1

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Platform Analytics" subtitle="AI Voice Agent performance across all clinics" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          <StatCard icon="📞" label="Total AI Calls"      value={totalCalls ?? 0}       color="blue" />
          <StatCard icon="📅" label="Calls This Month"    value={callsThisMonth ?? 0}   color="violet" />
          <StatCard icon="✅" label="Booked via AI"       value={bookedCalls ?? 0}       color="teal" />
          <StatCard icon="🎯" label="Conversion Rate"     value={`${conversionRate}%`}  color="amber" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Top Clinics */}
          <PageCard title="Top Performing Clinics" subtitle="Ranked by total AI calls">
            <div className="space-y-3">
              {topClinics.map((clinic, i) => {
                const count = clinic.calls?.[0]?.count ?? 0
                const pct = Math.round((count / maxCalls) * 100)
                const colors = ['var(--acc)', 'var(--teal)', 'var(--violet)', 'var(--amber)', 'var(--rose)']
                const color = colors[i % colors.length]
                return (
                  <div key={clinic.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--txt2)' }}>{clinic.name}</span>
                      <span className="font-semibold" style={{ color: 'var(--txt)' }}>{count} calls</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s4)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
              {topClinics.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--txt3)' }}>No call data yet</p>
              )}
            </div>
          </PageCard>

          {/* Call Breakdown */}
          <PageCard title="Call Outcomes" subtitle="Overall distribution">
            <div className="space-y-3">
              {[
                { label: 'Booked',      count: bookedCalls ?? 0,  color: 'var(--teal)',   total: totalCalls ?? 1 },
                { label: 'Not Booked',  count: (totalCalls ?? 0) - (bookedCalls ?? 0) - (missedCalls ?? 0), color: 'var(--amber)', total: totalCalls ?? 1 },
                { label: 'Missed / No outcome', count: missedCalls ?? 0, color: 'var(--rose)', total: totalCalls ?? 1 },
              ].map(item => {
                const pct = item.total > 0 ? Math.round((item.count / item.total) * 100) : 0
                return (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--txt2)' }}>{item.label}</span>
                      <span className="font-semibold" style={{ color: 'var(--txt)' }}>{item.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s4)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.color }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--b1)' }}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Calls',   value: totalCalls ?? 0,    color: 'var(--acc)' },
                  { label: 'Conversion',    value: `${conversionRate}%`, color: 'var(--teal)' },
                  { label: 'This Month',    value: callsThisMonth ?? 0, color: 'var(--violet)' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
                    <div className="font-syne text-xl font-black" style={{ color: m.color }}>{m.value}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--txt3)' }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </PageCard>
        </div>
      </div>
    </div>
  )
}
