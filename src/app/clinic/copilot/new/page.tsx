'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppTextarea } from '@/components/ui/FormField'
import PatientSearchSelect, { type PatientOption } from '@/components/clinic/PatientSearchSelect'

export default function NewCopilotSessionPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientId, setPatientId] = useState('')
  const [complaint, setComplaint] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clinic/patients').then(r => r.json()).then(d => setPatients(Array.isArray(d) ? d : []))
  }, [])

  async function submit() {
    setError('')
    if (!complaint.trim()) { setError('Describe the presenting complaint'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/clinic/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId || null, presenting_complaint: complaint.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to start session'); return }
      router.push(`/clinic/copilot/${data.sessionId}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="AI Clinical Co-Pilot" subtitle="Live consultation assistance — every suggestion requires your review" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,180,0,0.2)' }}>
          AI Suggestion — not a directive. Final clinical decision and legal responsibility rest with the treating physician.
        </div>
        {error && (
          <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
        )}

        <PageCard title="Patient (optional)">
          <FormField label="Patient" hint="Leave blank if not yet registered">
            <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
          </FormField>
        </PageCard>

        <PageCard title="Presenting Complaint">
          <FormField label="Chief complaint" required>
            <AppTextarea value={complaint} onChange={e => setComplaint(e.target.value)} rows={3} placeholder="e.g. 45yo male, fever and productive cough for 3 days" />
          </FormField>
        </PageCard>

        <div className="flex justify-end gap-2 mb-6">
          <AppBtn variant="secondary" onClick={() => router.push('/clinic/dashboard')}>Cancel</AppBtn>
          <AppBtn onClick={submit} disabled={saving}>{saving ? 'Starting…' : 'Start Consultation'}</AppBtn>
        </div>
      </div>
    </div>
  )
}
