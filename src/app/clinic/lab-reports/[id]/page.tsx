'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import StatusBadge from '@/components/ui/StatusBadge'

interface Marker { id: string; marker_name: string; value: string; unit: string | null; reference_range: string | null; flag: string; is_abnormal: boolean }
interface Explanation {
  id: string
  patient_summary_en: string
  patient_summary_hi: string | null
  abnormal_markers_summary: string | null
  doctor_discussion_points: string | null
  next_action_category: string
  is_ai_edited: boolean
  created_at: string
}
interface ReportDetail {
  report: { id: string; report_date: string | null; lab_name: string | null; status: string; uploaded_file_url: string | null; patients: { full_name: string; phone: string | null } | null }
  markers: Marker[]
  explanations: Explanation[]
  latestExplanation: Explanation | null
}

export default function LabReportDetailPage() {
  const params = useParams<{ id: string }>()
  const [data, setData] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [explaining, setExplaining] = useState(false)
  const [view, setView] = useState<'patient' | 'staff'>('staff')
  const [lang, setLang] = useState<'en' | 'hi'>('en')

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/clinic/lab-reports/${params.id}`)
    setData(await res.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [params.id])

  async function explain() {
    setExplaining(true)
    try {
      const res = await fetch(`/api/clinic/lab-reports/${params.id}/explain`, { method: 'POST' })
      if (res.ok) load()
      else { const d = await res.json(); alert(d.error || 'Failed to generate explanation') }
    } finally {
      setExplaining(false)
    }
  }

  if (loading || !data) {
    return (
      <>
        <Topbar title="Lab Report" />
        <div className="p-6 text-sm" style={{ color: 'var(--txt3)' }}>Loading…</div>
      </>
    )
  }

  const { report, markers, latestExplanation } = data

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title={`Lab Report — ${report.patients?.full_name || ''}`}
        subtitle={`${report.lab_name || 'Lab'} · ${report.report_date || ''}`}
        actions={<StatusBadge variant={report.status} />}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="Lab Values" noPad>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Marker', 'Value', 'Reference Range', 'Flag'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold" style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {markers.map((m, i) => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5 text-sm" style={{ borderBottom: i < markers.length - 1 ? '1px solid var(--b1)' : 'none', color: 'var(--txt)' }}>{m.marker_name}</td>
                  <td className="px-4 py-2.5 text-sm" style={{ borderBottom: i < markers.length - 1 ? '1px solid var(--b1)' : 'none', color: 'var(--txt)' }}>{m.value} {m.unit}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ borderBottom: i < markers.length - 1 ? '1px solid var(--b1)' : 'none', color: 'var(--txt3)' }}>{m.reference_range || '—'}</td>
                  <td className="px-4 py-2.5" style={{ borderBottom: i < markers.length - 1 ? '1px solid var(--b1)' : 'none' }}>
                    <StatusBadge variant={m.flag === 'critical' ? 'urgent_review' : m.flag === 'normal' ? 'routine' : 'at_risk'} label={m.flag} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {report.uploaded_file_url && (
            <div className="p-4">
              <a href={report.uploaded_file_url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'var(--acc)' }}>📎 View uploaded file</a>
            </div>
          )}
        </PageCard>

        {!latestExplanation ? (
          <PageCard title="Explanation">
            <p className="text-sm mb-4" style={{ color: 'var(--txt2)' }}>Generate a plain-language explanation for the patient and clinical discussion points for the doctor.</p>
            <AppBtn onClick={explain} disabled={explaining}>{explaining ? 'Generating…' : 'Generate Explanation'}</AppBtn>
          </PageCard>
        ) : (
          <PageCard
            title="Explanation"
            actions={
              <div className="flex gap-2 items-center">
                <div className="flex gap-1">
                  <button onClick={() => setView('patient')} className="px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: view === 'patient' ? 'var(--acc-dim)' : 'var(--s3)', color: view === 'patient' ? 'var(--acc)' : 'var(--txt2)' }}>Patient View</button>
                  <button onClick={() => setView('staff')} className="px-2.5 py-1 rounded-md text-xs font-medium" style={{ background: view === 'staff' ? 'var(--acc-dim)' : 'var(--s3)', color: view === 'staff' ? 'var(--acc)' : 'var(--txt2)' }}>Doctor/Staff View</button>
                </div>
                <AppBtn variant="secondary" size="sm" onClick={explain} disabled={explaining}>{explaining ? 'Regenerating…' : 'Regenerate'}</AppBtn>
              </div>
            }
          >
            <div className="mb-3">
              <StatusBadge variant={latestExplanation.next_action_category} />
            </div>

            {view === 'patient' ? (
              <div>
                <div className="rounded-lg px-4 py-2.5 text-xs mb-3" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
                  This is informational only, not a diagnosis. Please discuss with your doctor.
                </div>
                <div className="flex gap-1 mb-3">
                  <button onClick={() => setLang('en')} className="px-2.5 py-1 rounded-md text-xs" style={{ background: lang === 'en' ? 'var(--acc-dim)' : 'var(--s3)', color: lang === 'en' ? 'var(--acc)' : 'var(--txt2)' }}>English</button>
                  <button onClick={() => setLang('hi')} className="px-2.5 py-1 rounded-md text-xs" style={{ background: lang === 'hi' ? 'var(--acc-dim)' : 'var(--s3)', color: lang === 'hi' ? 'var(--acc)' : 'var(--txt2)' }}>हिन्दी</button>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--txt)' }}>
                  {lang === 'en' ? latestExplanation.patient_summary_en : (latestExplanation.patient_summary_hi || latestExplanation.patient_summary_en)}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--txt3)' }}>Abnormal Markers Summary</div>
                  <p className="text-sm" style={{ color: 'var(--txt)' }}>{latestExplanation.abnormal_markers_summary || 'None'}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--txt3)' }}>Doctor Discussion Points</div>
                  <p className="text-sm" style={{ color: 'var(--txt)' }}>{latestExplanation.doctor_discussion_points}</p>
                </div>
              </div>
            )}

            <div className="text-[10px] mt-4" style={{ color: 'var(--txt3)' }}>
              Generated {new Date(latestExplanation.created_at).toLocaleString()}{latestExplanation.is_ai_edited ? ' · edited by staff' : ''}
            </div>
          </PageCard>
        )}
      </div>
    </div>
  )
}
