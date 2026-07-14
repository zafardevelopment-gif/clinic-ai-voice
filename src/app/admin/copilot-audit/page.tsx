import Link from 'next/link'
import { getDb as createClient } from '@/lib/db'
import Topbar from '@/components/layout/Topbar'
import StatCard from '@/components/ui/StatCard'
import PageCard from '@/components/ui/PageCard'
import DataTable from '@/components/ui/DataTable'

/**
 * Cross-hospital AI Co-Pilot audit view (spec §9). Super Admin only —
 * gated by the admin layout's role check (see src/app/admin/layout.tsx).
 *
 * Purpose: every AI suggestion vs. the doctor's final decision is already
 * retained per-session (triage_results.ai_suggested_* + doctor_final_*,
 * ai_suggestions_accepted_count/ai_suggestions_total_count — see migration
 * 0012). This page surfaces that audit trail in aggregate (acceptance rate
 * per clinic) and at the session level (flagging low-acceptance sessions,
 * where the doctor rejected most AI suggestions — worth a compliance
 * spot-check, not necessarily a problem, but the kind of signal a
 * regulator or internal reviewer would want visibility into).
 */
export default async function CopilotAuditPage() {
  const db = createClient()

  const { data: finalizedSessions } = await db
    .from('triage_results')
    .select(`
      id, ai_suggestions_accepted_count, ai_suggestions_total_count, finalized_at, doctor_final_diagnosis,
      symptom_triage_sessions!inner ( id, clinic_id, patient_id, mode, clinics ( name ), patients ( full_name ) )
    `)
    .eq('symptom_triage_sessions.mode', 'doctor_copilot')
    .not('finalized_at', 'is', null)
    .order('finalized_at', { ascending: false })
    .limit(500)

  type Row = {
    id: string
    ai_suggestions_accepted_count: number
    ai_suggestions_total_count: number
    finalized_at: string
    doctor_final_diagnosis: string | null
    symptom_triage_sessions: {
      id: string
      clinic_id: string
      clinics: { name: string } | null
      patients: { full_name: string } | null
    }
  }

  const rows = (finalizedSessions || []) as unknown as Row[]

  const totalSessions = rows.length
  const totalSuggestions = rows.reduce((sum, r) => sum + r.ai_suggestions_total_count, 0)
  const totalAccepted = rows.reduce((sum, r) => sum + r.ai_suggestions_accepted_count, 0)
  const overallAcceptanceRate = totalSuggestions > 0 ? Math.round((totalAccepted / totalSuggestions) * 100) : 0

  // Sessions where the doctor accepted less than half of what was suggested
  // (and there was something to accept/reject) — a spot-check signal, not
  // an implication of error on either side.
  const lowAcceptanceSessions = rows.filter(
    r => r.ai_suggestions_total_count > 0 && r.ai_suggestions_accepted_count / r.ai_suggestions_total_count < 0.5,
  )

  // Per-clinic rollup.
  const byClinic = new Map<string, { name: string; sessions: number; accepted: number; total: number }>()
  for (const r of rows) {
    const clinicId = r.symptom_triage_sessions.clinic_id
    const clinicName = r.symptom_triage_sessions.clinics?.name || 'Unknown clinic'
    const entry = byClinic.get(clinicId) || { name: clinicName, sessions: 0, accepted: 0, total: 0 }
    entry.sessions += 1
    entry.accepted += r.ai_suggestions_accepted_count
    entry.total += r.ai_suggestions_total_count
    byClinic.set(clinicId, entry)
  }
  const clinicRows = Array.from(byClinic.values()).sort((a, b) => b.sessions - a.sessions)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="AI Co-Pilot Audit" subtitle="Cross-hospital review of AI suggestions vs. doctors' final decisions" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-4 gap-3.5 mb-5">
          <StatCard icon="🩺" label="Finalized Co-Pilot Sessions" value={totalSessions} color="blue" />
          <StatCard icon="💡" label="Total AI Suggestions" value={totalSuggestions} color="violet" />
          <StatCard icon="✅" label="Accepted or Edited" value={totalAccepted} color="teal" />
          <StatCard icon="📊" label="Overall Acceptance Rate" value={`${overallAcceptanceRate}%`} color="amber" />
        </div>

        <PageCard title="Acceptance Rate by Clinic" subtitle="How often doctors accept or edit (vs. reject) AI suggestions">
          <div className="space-y-3">
            {clinicRows.map(c => {
              const rate = c.total > 0 ? Math.round((c.accepted / c.total) * 100) : 0
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--txt2)' }}>{c.name} ({c.sessions} sessions)</span>
                    <span className="font-semibold" style={{ color: 'var(--txt)' }}>{rate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s4)' }}>
                    <div className="h-full rounded-full" style={{ width: `${rate}%`, background: rate < 50 ? 'var(--rose)' : 'var(--teal)' }} />
                  </div>
                </div>
              )
            })}
            {clinicRows.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--txt3)' }}>No finalized Co-Pilot sessions yet</p>
            )}
          </div>
        </PageCard>

        <PageCard title="Flagged for Review" subtitle="Sessions where the doctor accepted fewer than half of the AI suggestions">
          <DataTable
            emptyMessage="No flagged sessions"
            emptyIcon="✅"
            columns={[
              { key: 'clinic', header: 'Clinic', render: (r: Row) => r.symptom_triage_sessions.clinics?.name || '—' },
              { key: 'patient', header: 'Patient', render: (r: Row) => r.symptom_triage_sessions.patients?.full_name || 'Not registered' },
              { key: 'diagnosis', header: 'Final Diagnosis', render: (r: Row) => r.doctor_final_diagnosis || '—' },
              { key: 'acceptance', header: 'Accepted', render: (r: Row) => `${r.ai_suggestions_accepted_count} / ${r.ai_suggestions_total_count}` },
              { key: 'finalized_at', header: 'Finalized', render: (r: Row) => new Date(r.finalized_at).toLocaleString() },
              { key: 'actions', header: '', render: (r: Row) => (
                <Link href={`/clinic/copilot/${r.symptom_triage_sessions.id}`} className="text-xs font-semibold" style={{ color: 'var(--acc)' }}>View</Link>
              ) },
            ]}
            data={lowAcceptanceSessions}
          />
        </PageCard>
      </div>
    </div>
  )
}
