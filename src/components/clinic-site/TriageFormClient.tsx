'use client'

import { useMemo, useState } from 'react'

interface Props {
  clinicName: string
  slug: string
}

const RED_FLAG_HINTS = [
  'chest pain', 'seene mein dard', "can't breathe", 'saans lene mein takleef',
  'unconscious', 'behosh', 'seizure', 'daura', 'heavy bleeding', 'bahut khoon',
  'stroke', 'face drooping', 'muh tedha',
]

export default function TriageFormClient({ clinicName, slug }: Props) {
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [duration, setDuration] = useState('')
  const [fever, setFever] = useState(false)
  const [painSeverity, setPainSeverity] = useState(0)
  const [ageGroup, setAgeGroup] = useState('adult')
  const [conditions, setConditions] = useState('')
  const [medicines, setMedicines] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ category: string; summary: string; isEmergency: boolean } | null>(null)
  const [error, setError] = useState('')

  const clientSideRedFlag = useMemo(() => {
    const text = chiefComplaint.toLowerCase()
    return RED_FLAG_HINTS.some(h => text.includes(h))
  }, [chiefComplaint])

  async function submit() {
    setError('')
    if (!chiefComplaint.trim()) { setError('Please describe your main symptom.'); return }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/clinic/${slug}/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      if (!res.ok) { setError(data.error || 'Something went wrong. Please try again or call the clinic.'); return }
      setResult(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', padding: '32px 16px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{clinicName} — Symptom Check</h1>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
          Tell us what&apos;s bothering you before your visit. This helps our staff prepare.
        </p>

        <div style={{ background: '#fff3cd', border: '1px solid #ffe69c', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#7a5c00', marginBottom: 20 }}>
          ⚠️ This is not a diagnosis. Final medical advice must come from a doctor.
        </div>

        {clientSideRedFlag && !result && (
          <div style={{ background: '#fde8e8', border: '1px solid #f5b5b5', borderRadius: 10, padding: '14px 16px', fontSize: 14, color: '#a11', marginBottom: 20, fontWeight: 600 }}>
            🚨 This may be a medical emergency. If symptoms are severe, please call emergency services or go to the nearest hospital immediately — do not wait to submit this form.
          </div>
        )}

        {!result ? (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
            {error && (
              <div style={{ background: '#fde8e8', color: '#a11', borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>{error}</div>
            )}

            <Field label="What's the main problem? *">
              <textarea
                value={chiefComplaint}
                onChange={e => setChiefComplaint(e.target.value)}
                rows={3}
                placeholder="e.g. Fever and cough for 2 days"
                style={inputStyle}
              />
            </Field>

            <Field label="How long has this been going on?">
              <input value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 2 days" style={inputStyle} />
            </Field>

            <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={fever} onChange={e => setFever(e.target.checked)} /> Fever
              </label>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#666' }}>Pain severity: {painSeverity}/10</label>
                <input type="range" min={0} max={10} value={painSeverity} onChange={e => setPainSeverity(parseInt(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>

            <Field label="Age group">
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} style={inputStyle}>
                <option value="infant">Infant (0-2 yrs)</option>
                <option value="child">Child (3-12 yrs)</option>
                <option value="adult">Adult</option>
                <option value="senior">Senior (65+)</option>
              </select>
            </Field>

            <Field label="Existing conditions (comma separated)">
              <input value={conditions} onChange={e => setConditions(e.target.value)} placeholder="e.g. diabetes, high BP" style={inputStyle} />
            </Field>

            <Field label="Current medicines (comma separated)">
              <input value={medicines} onChange={e => setMedicines(e.target.value)} placeholder="e.g. metformin" style={inputStyle} />
            </Field>

            <button
              onClick={submit}
              disabled={submitting}
              style={{ width: '100%', padding: '12px', borderRadius: 10, background: '#2e86ff', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 8 }}
            >
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 20 }}>
            {result.isEmergency ? (
              <div style={{ background: '#fde8e8', border: '1px solid #f5b5b5', borderRadius: 10, padding: 16, color: '#a11', fontWeight: 600, marginBottom: 14 }}>
                🚨 {result.summary}
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#888', marginBottom: 6 }}>
                  Possible urgency: {result.category.replace(/_/g, ' ')}
                </div>
                <p style={{ fontSize: 14, color: '#333', lineHeight: 1.6 }}>{result.summary}</p>
              </>
            )}
            <p style={{ fontSize: 12, color: '#888', marginTop: 16 }}>
              Our clinic staff has received this summary and will review it before your visit.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}
