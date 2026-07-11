/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSession } from '@/lib/session'
import { getDb } from '@/lib/db'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import PageCard from '@/components/ui/PageCard'
import StatusBadge from '@/components/ui/StatusBadge'
import ClinicOsWidgets from '@/components/clinic/ClinicOsWidgets'
import Link from 'next/link'

export default async function ClinicDashboard() {
  const session = await getSession()
  const supabase = getDb()

  const clinicId = session?.clinicId
  let clinic: { name: string; is_active: boolean } | null = null
  if (clinicId) {
    const { data: clinicData } = await supabase
      .from('clinics').select('name, is_active').eq('id', clinicId).single()
    clinic = clinicData ?? null
  }

  if (!clinicId) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="Dashboard" />
        <div className="flex-1 flex items-center justify-center flex-col gap-3">
          <div className="text-4xl opacity-40">🏥</div>
          <p className="text-sm" style={{ color: 'var(--txt2)' }}>No clinic assigned. Contact your administrator.</p>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalDoctors },
    { count: totalPatients },
    { count: totalAppointments },
    { count: todayAppointments },
    {},
    { count: callsToday },
    { count: bookedToday },
    { data: recentAppointments },
    { data: upcomingAppts },
  ] = await Promise.all([
    supabase.from('doctors').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('is_active', true),
    supabase.from('patients').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('appointment_date', today),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', today),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('outcome', 'booked').gte('created_at', today),
    supabase.from('appointments')
      .select('*, patients(full_name), doctors(full_name, specialization)')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', today)
      .order('appointment_date', { ascending: true })
      .limit(8),
    supabase.from('calls')
      .select('*, patients(full_name)')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const convRate = callsToday && bookedToday ? Math.round((bookedToday / callsToday) * 100) : 0

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title={clinic?.name || 'Dashboard'}
        subtitle={`Welcome back, ${session?.fullName || 'Admin'}`}
        actions={
          <Link href="/clinic/appointments/new">
            <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--acc)', cursor: 'pointer', border: 'none' }}>
              + Book Appointment
            </button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Row 1 */}
        <div className="grid grid-cols-4 gap-3.5 mb-3.5">
          <StatCard icon="👨‍⚕️" label="Active Doctors"     value={totalDoctors ?? 0}        color="blue" />
          <StatCard icon="🧑‍🤝‍🧑" label="Total Patients"   value={totalPatients ?? 0}       color="teal" />
          <StatCard icon="📅" label="Today's Appts"         value={todayAppointments ?? 0}   color="amber" />
          <StatCard icon="📊" label="Total Appointments"    value={totalAppointments ?? 0}   color="violet" />
        </div>

        {/* AI Stats Row 2 */}
        <div className="grid grid-cols-3 gap-3.5 mb-5">
          <StatCard icon="📞" label="AI Calls Today"        value={callsToday ?? 0}          color="violet" delta="Live" deltaType="up" />
          <StatCard icon="✅" label="Booked via AI Today"   value={bookedToday ?? 0}          color="teal" />
          <StatCard icon="🎯" label="Conversion Rate Today" value={`${convRate}%`}            color="amber" />
        </div>

        <ClinicOsWidgets />

        {/* Two columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Upcoming Appointments */}
          <PageCard title="Upcoming Appointments" subtitle="Next scheduled" noPad
            actions={<Link href="/clinic/appointments" className="text-[12px] font-semibold" style={{ color: 'var(--acc)' }}>View All →</Link>}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Patient', 'Doctor', 'Date', 'Status'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                      style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(recentAppointments || []).map((appt: any, i: number) => (
                  <tr key={appt.id} className="group">
                    <td className="px-4 py-3 text-sm font-medium group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentAppointments?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)' }}>
                      {appt.patients?.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentAppointments?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                      {appt.doctors?.full_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentAppointments?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                      {appt.appointment_date} {appt.appointment_time?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (recentAppointments?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                      <StatusBadge variant={appt.status} />
                    </td>
                  </tr>
                ))}
                {(!recentAppointments || recentAppointments.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--txt3)' }}>No upcoming appointments</td></tr>
                )}
              </tbody>
            </table>
          </PageCard>

          {/* Recent AI Calls */}
          <PageCard title="Recent AI Calls" subtitle="Today's activity" noPad
            actions={<Link href="/clinic/call-logs" className="text-[12px] font-semibold" style={{ color: 'var(--acc)' }}>View All →</Link>}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Phone', 'Patient', 'Type', 'Outcome'].map(h => (
                    <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                      style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(upcomingAppts || []).map((call: any, i: number) => (
                  <tr key={call.id} className="group">
                    <td className="px-4 py-3 text-sm font-medium group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (upcomingAppts?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt)', fontFamily: 'monospace' }}>
                      {call.phone_number}
                    </td>
                    <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (upcomingAppts?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                      {call.patients?.full_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (upcomingAppts?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                      <StatusBadge variant={call.call_type} />
                    </td>
                    <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                      style={{ borderBottom: i < (upcomingAppts?.length ?? 0) - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                      {call.outcome ? <StatusBadge variant={call.outcome} /> : <span style={{ color: 'var(--txt3)' }}>—</span>}
                    </td>
                  </tr>
                ))}
                {(!upcomingAppts || upcomingAppts.length === 0) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--txt3)' }}>No calls today</td></tr>
                )}
              </tbody>
            </table>
          </PageCard>
        </div>
      </div>
    </div>
  )
}
