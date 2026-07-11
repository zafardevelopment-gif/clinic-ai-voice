'use client'

import { useEffect, useState } from 'react'
import AppModal from '@/components/ui/AppModal'
import AppBtn from '@/components/ui/AppBtn'
import StatusBadge from '@/components/ui/StatusBadge'
import { AppTextarea } from '@/components/ui/FormField'

interface Props {
  sessionId: string
  onClose: () => void
}

interface Detail {
  session: {
    id: string
    source: string
    age_group: string | null
    status: string
    patients: { full_name: string; phone: string | null } | null
  }
  answers: {
    chief_complaint: string
    duration: string | null
    fever: boolean
    pain_severity: number | null
    existing_conditions: string[]
    current_medicines: string[]
    red_flags: string[]
  } | null
  result: {
    category: string
    summary: string
    doctor_notes: string | null
    is_ai_edited: boolean
    doctors: { full_name: string } | null
  } | null
}

export default function TriageSummaryPanel({ sessionId, onClose }: Props) {
  const [data, setData] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [summaryDraft, setSummaryDraft] = useState('')
  const [notesDraft, setNotesDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/clinic/triage/${sessionId}`)
      .then(r => r.json())
      .then((d: Detail) => {
        setData(d)
        setSummaryDraft(d.result?.summary || '')
        setNotesDraft(d.result?.doctor_notes || '')
      })
      .finally(() => setLoading(false))
  }, [sessionId])

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/clinic/triage/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: summaryDraft, doctor_notes: notesDraft }),
      })
      setEditing(false)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal open onClose={onClose} title="Triage Summary" size="lg">
      {loading || !data ? (
        <div className="text-sm py-8 text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg px-4 py-2.5 text-xs" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
            This is not a diagnosis. Final medical advice must come from a doctor.
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{data.session.patients?.full_name || 'Not registered'}</div>
              <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{data.session.patients?.phone}</div>
            </div>
            {data.result && <StatusBadge variant={data.result.category} />}
          </div>

          {data.answers?.red_flags && data.answers.red_flags.length > 0 && (
            <div className="rounded-lg px-4 py-3 text-sm font-semibold" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>
              🚨 Red flags detected: {data.answers.red_flags.join(', ').replace(/_/g, ' ')}
            </div>
          )}

          {data.answers && (
            <div className="rounded-xl p-4" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
              <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--txt3)' }}>Reported Symptoms</div>
              <div className="text-sm mb-1" style={{ color: 'var(--txt)' }}><strong>Chief complaint:</strong> {data.answers.chief_complaint}</div>
              <div className="text-xs" style={{ color: 'var(--txt2)' }}>
                Duration: {data.answers.duration || '—'} · Fever: {data.answers.fever ? 'Yes' : 'No'} · Pain: {data.answers.pain_severity ?? '—'}/10
              </div>
              {data.answers.existing_conditions.length > 0 && (
                <div className="text-xs mt-1" style={{ color: 'var(--txt2)' }}>Conditions: {data.answers.existing_conditions.join(', ')}</div>
              )}
              {data.answers.current_medicines.length > 0 && (
                <div className="text-xs mt-1" style={{ color: 'var(--txt2)' }}>Medicines: {data.answers.current_medicines.join(', ')}</div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Patient-safe Summary</div>
              {!editing && <AppBtn variant="ghost" size="sm" onClick={() => setEditing(true)}>Edit</AppBtn>}
            </div>
            {editing ? (
              <AppTextarea value={summaryDraft} onChange={e => setSummaryDraft(e.target.value)} rows={3} />
            ) : (
              <p className="text-sm" style={{ color: 'var(--txt)' }}>{data.result?.summary}</p>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--txt3)' }}>Doctor Discussion Points</div>
            {editing ? (
              <AppTextarea value={notesDraft} onChange={e => setNotesDraft(e.target.value)} rows={3} />
            ) : (
              <p className="text-sm" style={{ color: 'var(--txt2)' }}>{data.result?.doctor_notes}</p>
            )}
          </div>

          {data.result?.doctors && (
            <div className="text-xs" style={{ color: 'var(--txt3)' }}>Suggested doctor: {data.result.doctors.full_name}</div>
          )}

          {data.result?.is_ai_edited && (
            <div className="text-[10px]" style={{ color: 'var(--txt3)' }}>✓ Reviewed and edited by clinic staff</div>
          )}

          {editing && (
            <div className="flex justify-end gap-2">
              <AppBtn variant="secondary" onClick={() => setEditing(false)}>Cancel</AppBtn>
              <AppBtn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save & Mark Reviewed'}</AppBtn>
            </div>
          )}
        </div>
      )}
    </AppModal>
  )
}
