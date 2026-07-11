'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import PatientSearchSelect, { type PatientOption } from '@/components/clinic/PatientSearchSelect'

export default function NewTriageEntryPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientId, setPatientId] = useState('')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [duration, setDuration] = useState('')
  const [fever, setFever] = useState(false)
  const [painSeverity, setPainSeverity] = useState(0)
  const [ageGroup, setAgeGroup] = useState('adult')
  const [conditions, setConditions] = useState('')
  const [medicines, setMedicines] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clinic/patients').then(r => r.json()).then(d => setPatients(Array.isArray(d) ? d : []))
  }, [])

  async function submit() {
    setError('')
    if (!chiefComplaint.trim()) { setError('Describe the chief complaint'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/clinic/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId || null,
          source: 'counter',
          chief_complaint: chiefComplaint.trim(),
          duration: duration || undefined,
          fever,
          pain_severity: painSeverity,
          age_group: ageGroup,
          existing_conditions: conditions ? conditions.split(',').map(s => s.trim()).filter(Boolean) : [],
          current_medicines: medicines ? medicines.split(',').map(s => s.trim()).filter(Boolean) : [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to submit'); return }
      router.push('/clinic/triage')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="New Triage Entry" subtitle="Counter-desk symptom intake before the visit" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid rgba(255,180,0,0.2)' }}>
          This is not a diagnosis. Final medical advice must come from a doctor.
        </div>
        {error && (
          <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
        )}

        <PageCard title="Patient (optional)">
          <FormField label="Patient" hint="Leave blank for a walk-in / not-yet-registered patient">
            <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
          </FormField>
        </PageCard>

        <PageCard title="Symptoms">
          <div className="space-y-4">
            <FormField label="Chief complaint" required>
              <AppTextarea value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} rows={2} placeholder="e.g. Fever and cough for 2 days" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Duration">
                <AppInput value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 2 days" />
              </FormField>
              <FormField label="Age group">
                <AppSelect value={ageGroup} onChange={e => setAgeGroup(e.target.value)}>
                  <option value="infant">Infant (0-2 yrs)</option>
                  <option value="child">Child (3-12 yrs)</option>
                  <option value="adult">Adult</option>
                  <option value="senior">Senior (65+)</option>
                </AppSelect>
              </FormField>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--txt)' }}>
                <input type="checkbox" checked={fever} onChange={e => setFever(e.target.checked)} /> Fever
              </label>
              <div className="flex-1">
                <label className="text-xs" style={{ color: 'var(--txt3)' }}>Pain severity: {painSeverity}/10</label>
                <input type="range" min={0} max={10} value={painSeverity} onChange={e => setPainSeverity(parseInt(e.target.value))} className="w-full" />
              </div>
            </div>
            <FormField label="Existing conditions (comma separated)">
              <AppInput value={conditions} onChange={e => setConditions(e.target.value)} placeholder="e.g. diabetes, high BP" />
            </FormField>
            <FormField label="Current medicines (comma separated)">
              <AppInput value={medicines} onChange={e => setMedicines(e.target.value)} placeholder="e.g. metformin" />
            </FormField>
          </div>
        </PageCard>

        <div className="flex justify-end gap-2 mb-6">
          <AppBtn variant="secondary" onClick={() => router.push('/clinic/triage')}>Cancel</AppBtn>
          <AppBtn onClick={submit} disabled={saving}>{saving ? 'Submitting…' : 'Submit for Triage'}</AppBtn>
        </div>
      </div>
    </div>
  )
}
