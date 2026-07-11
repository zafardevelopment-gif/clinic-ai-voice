'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput } from '@/components/ui/FormField'
import PatientSearchSelect, { type PatientOption } from '@/components/clinic/PatientSearchSelect'

interface MarkerRow { marker_name: string; value: string; unit: string; reference_range: string }

const emptyMarker = (): MarkerRow => ({ marker_name: '', value: '', unit: '', reference_range: '' })

export default function NewLabReportPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientId, setPatientId] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [labName, setLabName] = useState('')
  const [markers, setMarkers] = useState<MarkerRow[]>([emptyMarker()])
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/clinic/patients').then(r => r.json()).then(d => setPatients(Array.isArray(d) ? d : []))
  }, [])

  function updateMarker(i: number, patch: Partial<MarkerRow>) {
    setMarkers(prev => prev.map((m, idx) => idx === i ? { ...m, ...patch } : m))
  }

  async function save() {
    setError('')
    if (!patientId) { setError('Select a patient'); return }
    const cleanMarkers = markers.filter(m => m.marker_name.trim() && m.value.trim())
    if (cleanMarkers.length === 0) { setError('Add at least one lab value'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/clinic/lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId, report_date: reportDate || null, lab_name: labName || null }),
      })
      const report = await res.json()
      if (!res.ok) { setError(report.error || 'Failed to create report'); return }

      if (file) {
        const form = new FormData()
        form.append('file', file)
        await fetch(`/api/clinic/lab-reports/${report.id}/upload`, { method: 'POST', body: form })
      }

      const markersRes = await fetch(`/api/clinic/lab-reports/${report.id}/markers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markers: cleanMarkers }),
      })
      if (!markersRes.ok) { const d = await markersRes.json(); setError(d.error || 'Failed to save markers'); return }

      router.push(`/clinic/lab-reports/${report.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="New Lab Report" subtitle="Enter lab values manually to generate a plain-language explanation" />
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="rounded-lg px-4 py-2.5 text-sm mb-4" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
        )}

        <PageCard title="Report Details">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <FormField label="Patient" required>
                <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
              </FormField>
            </div>
            <FormField label="Report date">
              <AppInput type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} />
            </FormField>
            <FormField label="Lab name">
              <AppInput value={labName} onChange={e => setLabName(e.target.value)} placeholder="e.g. City Diagnostics" />
            </FormField>
            <FormField label="Upload report (optional)" hint="PDF/image stored for reference — not auto-parsed in V1">
              <input type="file" accept=".pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="text-xs" style={{ color: 'var(--txt2)' }} />
            </FormField>
          </div>
        </PageCard>

        <PageCard
          title="Lab Values"
          actions={<AppBtn variant="secondary" size="sm" onClick={() => setMarkers(prev => [...prev, emptyMarker()])}>+ Add Value</AppBtn>}
        >
          <div className="space-y-3">
            {markers.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <FormField label="Marker">
                    <AppInput value={m.marker_name} onChange={e => updateMarker(i, { marker_name: e.target.value })} placeholder="e.g. Hemoglobin" />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Value">
                    <AppInput value={m.value} onChange={e => updateMarker(i, { value: e.target.value })} placeholder="13.5" />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Unit">
                    <AppInput value={m.unit} onChange={e => updateMarker(i, { unit: e.target.value })} placeholder="g/dL" />
                  </FormField>
                </div>
                <div className="col-span-3">
                  <FormField label="Reference range">
                    <AppInput value={m.reference_range} onChange={e => updateMarker(i, { reference_range: e.target.value })} placeholder="13-17" />
                  </FormField>
                </div>
                <div className="col-span-1">
                  {markers.length > 1 && (
                    <AppBtn variant="ghost" size="sm" onClick={() => setMarkers(prev => prev.filter((_, idx) => idx !== i))}>✕</AppBtn>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PageCard>

        <div className="flex justify-end gap-2 mb-6">
          <AppBtn variant="secondary" onClick={() => router.push('/clinic/lab-reports')}>Cancel</AppBtn>
          <AppBtn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save & Continue'}</AppBtn>
        </div>
      </div>
    </div>
  )
}
