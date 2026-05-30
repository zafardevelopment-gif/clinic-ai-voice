import { getDb as createClient } from '@/lib/db'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import StatusBadge from '@/components/ui/StatusBadge'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function ClinicsPage() {
  const supabase = createClient()

  const { data: rawClinics } = await supabase
    .from('clinics')
    .select('id, name, phone, email, city, is_active, created_at')
    .order('created_at', { ascending: false })
  const clinics = rawClinics ?? []

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Clinics"
        subtitle={`${clinics.length} registered`}
        actions={
          <Link href="/admin/clinics/new">
            <button className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'var(--acc)', cursor: 'pointer', border: 'none' }}>
              + New Clinic
            </button>
          </Link>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="All Clinics" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Clinic', 'City', 'Phone', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clinics.map((clinic, i) => (
                <tr key={clinic.id} className="group">
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < clinics.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{clinic.name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{clinic.email || '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < clinics.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    {clinic.city || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < clinics.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)', fontFamily: 'monospace' }}>
                    {clinic.phone || '—'}
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < clinics.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={clinic.is_active ? 'active' : 'inactive'} />
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]"
                    style={{ borderBottom: i < clinics.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="flex gap-2">
                      <Link href={`/admin/clinics/${clinic.id}`}>
                        <button className="h-8 px-3 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--s3)', border: '1px solid var(--b2)', color: 'var(--txt)', cursor: 'pointer' }}>
                          Edit
                        </button>
                      </Link>
                      <Link href={`/admin/clinics/${clinic.id}/subscription`}>
                        <button className="h-8 px-3 rounded-lg text-xs font-semibold"
                          style={{ background: 'var(--acc-dim)', border: '1px solid var(--b2)', color: 'var(--acc)', cursor: 'pointer' }}>
                          Subscription
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {clinics.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="text-4xl mb-3 opacity-40">🏥</div>
                    <p className="text-sm" style={{ color: 'var(--txt3)' }}>No clinics yet. Add your first clinic.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>
    </div>
  )
}
