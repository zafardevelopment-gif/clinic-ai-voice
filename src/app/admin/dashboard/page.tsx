/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb } from '@/lib/db'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import PageCard from '@/components/ui/PageCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = getDb()

  const [
    { count: totalClinics },
    { count: totalDoctors },
    { count: totalPatients },
    { count: totalAppointments },
    { count: totalCalls },
    { data: recentClinics },
    { data: recentCalls },
  ] = await Promise.all([
    supabase.from('clinics').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('patients').select('*', { count: 'exact', head: true }),
    supabase.from('appointments').select('*', { count: 'exact', head: true }),
    supabase.from('calls').select('*', { count: 'exact', head: true }),
    supabase.from('clinics').select('id, name, city, is_active, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('calls').select('id, phone_number, call_type, outcome, created_at, clinics(name)').order('created_at', { ascending: false }).limit(8),
  ])

  const bookedCalls = await supabase
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .eq('outcome', 'booked')

  const conversionRate = totalCalls && bookedCalls.count
    ? Math.round((bookedCalls.count / totalCalls) * 100)
    : 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Admin Dashboard"
        subtitle="Platform overview"
        actions={
          <Link href="/admin/clinics/new">
            <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--acc)', cursor: 'pointer', border: 'none' }}>
              + Add Clinic
            </button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          <StatCard icon="🏥" label="Active Clinics"     value={totalClinics ?? 0}     delta="+2 this mo"  deltaType="up"  color="blue" />
          <StatCard icon="👨‍⚕️" label="Total Doctors"   value={totalDoctors ?? 0}     delta="Across all"  deltaType="neutral" color="teal" />
          <StatCard icon="📞" label="Total AI Calls"     value={totalCalls ?? 0}       delta="+18% this wk" deltaType="up" color="violet" />
          <StatCard icon="🎯" label="Conversion Rate"    value={`${conversionRate}%`}  delta="Booked calls" deltaType="neutral" color="amber" />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatCard icon="🧑‍🤝‍🧑" label="Total Patients"     value={totalPatients ?? 0}     color="teal" />
          <StatCard icon="📅" label="Total Appointments" value={totalAppointments ?? 0}  color="blue" />
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Recent Clinics */}
          <PageCard title="Recent Clinics" subtitle="Newly onboarded" noPad
            actions={
              <Link href="/admin/clinics" className="text-[12px] font-semibold" style={{ color: 'var(--acc)' }}>View All →</Link>
            }>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Clinic', 'City', 'Status'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                      style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recentClinics || []).map((c, i) => (
                  <tr key={c.id} className="group">
                    <td className="px-4 py-3 text-sm font-medium group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentClinics?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)' }}>
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentClinics?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                      {c.city || '—'}
                    </td>
                    <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentClinics?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                      <StatusBadge variant={c.is_active ? 'active' : 'inactive'} />
                    </td>
                  </tr>
                ))}
                {(!recentClinics || recentClinics.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--txt3)' }}>No clinics yet</td></tr>
                )}
              </tbody>
            </table>
          </PageCard>

          {/* Recent Calls */}
          <PageCard title="Recent AI Calls" subtitle="Across all clinics" noPad
            actions={
              <Link href="/admin/calls" className="text-[12px] font-semibold" style={{ color: 'var(--acc)' }}>View All →</Link>
            }>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Phone', 'Clinic', 'Type', 'Outcome'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                      style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recentCalls || []).map((c: any, i: number) => (
                  <tr key={c.id} className="group">
                    <td className="px-4 py-3 text-sm font-medium group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)', fontFamily: 'monospace' }}>
                      {c.phone_number}
                    </td>
                    <td className="px-4 py-3 text-[12px] group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                      {c.clinics?.name || '—'}
                    </td>
                    <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                      <StatusBadge variant={c.call_type} />
                    </td>
                    <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentCalls?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                      {c.outcome ? <StatusBadge variant={c.outcome} /> : <span style={{ color: 'var(--txt3)' }}>—</span>}
                    </td>
                  </tr>
                ))}
                {(!recentCalls || recentCalls.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--txt3)' }}>No calls yet</td></tr>
                )}
              </tbody>
            </table>
          </PageCard>
        </div>
      </div>
    </div>
  )
}
