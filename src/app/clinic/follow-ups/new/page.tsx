'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import PatientSearchSelect, { type PatientOption } from '@/components/clinic/PatientSearchSelect'
import type { Medicine } from '@/types/database'

const emptyMedicine = (): Medicine => ({ name: '', dosage: '', frequency: '', duration_days: 5 })

export default function NewFollowUpPlanPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientId, setPatientId] = useState('')
  const [medicines, setMedicines] = useState<Medicine[]>([emptyMedicine()])
  const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'twice_daily' | 'weekly'>('daily')
  const [followUpDate, setFollowUpDate] = useState('')
  const [careInstructions, setCareInstructions] = useState('')
  const [escalationContact, setEscalationContact] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clinic/patients').then(r => r.json()).then(d => setPatients(Array.isArray(d) ? d : []))
  }, [])

  function updateMedicine(i: number, patch: Partial<Medicine>) {
    setMedicines(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  }

  async function save() {
    setError('')
    if (!patientId) { setError('Select a patient'); return }
    const cleanMedicines = medicines.filter(m => m.name.trim())
    if (cleanMedicines.length === 0) { setError('Add at least one medicine'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/clinic/follow-up-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          medicines: cleanMedicines,
          reminder_frequency: reminderFrequency,
          follow_up_date: followUpDate || null,
          care_instructions: careInstructions || null,
          escalation_contact: escalationContact || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create plan'); return }
      router.push('/clinic/follow-ups')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="New Follow-up Plan" subtitle="Post-visit medicine adherence & follow-up reminders" />
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
            {error}
          </div>
        )}

        <PageCard title="Patient">
          <FormField label="Patient" required>
            <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
          </FormField>
        </PageCard>

        <PageCard
          title="Prescribed Medicines"
          actions={<AppBtn variant="secondary" size="sm" onClick={() => setMedicines(prev => [...prev, emptyMedicine()])}>+ Add Medicine</AppBtn>}
        >
          <div className="space-y-3">
            {medicines.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <FormField label="Name">
                    <AppInput value={m.name} onChange={e => updateMedicine(i, { name: e.target.value })} placeholder="e.g. Amoxicillin" />
                  </FormField>
                </div>
                <div className="col-span-3">
                  <FormField label="Dosage">
                    <AppInput value={m.dosage} onChange={e => updateMedicine(i, { dosage: e.target.value })} placeholder="500mg" />
                  </FormField>
                </div>
                <div className="col-span-3">
                  <FormField label="Frequency">
                    <AppInput value={m.frequency} onChange={e => updateMedicine(i, { frequency: e.target.value })} placeholder="3x/day" />
                  </FormField>
                </div>
                <div className="col-span-1">
                  <FormField label="Days">
                    <AppInput type="number" min={1} value={m.duration_days} onChange={e => updateMedicine(i, { duration_days: parseInt(e.target.value) || 1 })} />
                  </FormField>
                </div>
                <div className="col-span-1">
                  {medicines.length > 1 && (
                    <AppBtn variant="ghost" size="sm" onClick={() => setMedicines(prev => prev.filter((_, idx) => idx !== i))}>✕</AppBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PageCard>

        <PageCard title="Reminders & Follow-up">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Reminder frequency">
              <AppSelect value={reminderFrequency} onChange={e => setReminderFrequency(e.target.value as typeof reminderFrequency)}>
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice daily</option>
                <option value="weekly">Weekly</option>
              </AppSelect>
            </FormField>
            <FormField label="Follow-up visit date" hint="Optional — leave blank if no follow-up visit needed">
              <AppInput type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
            </FormField>
            <div className="col-span-2">
              <FormField label="Care instructions">
                <AppTextarea value={careInstructions} onChange={e => setCareInstructions(e.target.value)} rows={3} placeholder="e.g. Rest, plenty of fluids, avoid spicy food" />
              </FormField>
            </div>
            <FormField label="Escalation contact" hint="Number the clinic calls if the patient needs urgent callback">
              <AppInput value={escalationContact} onChange={e => setEscalationContact(e.target.value)} placeholder="+91…" />
            </FormField>
          </div>
        </PageCard>

        <div className="flex justify-end gap-2 mb-6">
          <AppBtn variant="secondary" onClick={() => router.push('/clinic/follow-ups')}>Cancel</AppBtn>
          <AppBtn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create Plan'}</AppBtn>
        </div>
      </div>
    </div>
  )
}
