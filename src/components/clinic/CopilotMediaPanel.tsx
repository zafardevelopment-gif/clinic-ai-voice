'use client'

import { useEffect, useRef, useState } from 'react'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'

interface ExtractedMedicine {
  medicine_name: string
  dosage: string | null
  frequency: string | null
}

interface PatientMediaRow {
  id: string
  media_type: 'prescription_photo' | 'condition_photo' | 'condition_video'
  file_url: string
  doctor_confirmed: boolean
  ai_extracted_data: {
    medicines?: ExtractedMedicine[]
    description?: string
    differential_considerations?: string[] | null
    warnings?: string[]
  } | null
}

export default function CopilotMediaPanel({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<PatientMediaRow[]>([])
  const [uploading, setUploading] = useState<'prescription_photo' | 'condition_photo' | 'condition_video' | null>(null)
  const [error, setError] = useState('')
  const prescriptionInputRef = useRef<HTMLInputElement>(null)
  const conditionInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const res = await fetch(`/api/clinic/copilot/${sessionId}/media`)
    const data = await res.json()
    if (Array.isArray(data)) setItems(data)
  }

  useEffect(() => { load() }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(file: File, mediaType: 'prescription_photo' | 'condition_photo' | 'condition_video') {
    setUploading(mediaType)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('media_type', mediaType)
      const res = await fetch(`/api/clinic/copilot/${sessionId}/media`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Upload failed'); return }
      load()
    } finally {
      setUploading(null)
    }
  }

  async function confirm(mediaId: string) {
    const res = await fetch(`/api/clinic/copilot/${sessionId}/media/${mediaId}/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    if (res.ok) load()
  }

  return (
    <PageCard title="Prescription & Visual Capture" subtitle="Extracted data requires your confirmation before it's saved">
      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm mb-3" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
      )}
      <div className="flex gap-2 mb-4">
        <input ref={prescriptionInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, 'prescription_photo'); e.target.value = '' }} />
        <AppBtn variant="secondary" size="sm" onClick={() => prescriptionInputRef.current?.click()} disabled={uploading === 'prescription_photo'}>
          {uploading === 'prescription_photo' ? 'Reading…' : 'Upload Old Prescription'}
        </AppBtn>
        <input ref={conditionInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; upload(f, f.type.startsWith('video') ? 'condition_video' : 'condition_photo'); e.target.value = '' }} />
        <AppBtn variant="secondary" size="sm" onClick={() => conditionInputRef.current?.click()} disabled={!!uploading}>
          {uploading === 'condition_photo' || uploading === 'condition_video' ? 'Analyzing…' : 'Capture Photo/Video of Condition'}
        </AppBtn>
      </div>

      {items.length === 0 ? (
        <div className="text-xs" style={{ color: 'var(--txt3)' }}>No prescriptions or condition media uploaded yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-lg p-3" style={{ border: '1px solid var(--b1)', background: 'var(--s1)' }}>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold capitalize" style={{ color: 'var(--txt2)' }}>{item.media_type.replace(/_/g, ' ')}</span>
                {item.doctor_confirmed ? (
                  <span className="text-[11px]" style={{ color: 'var(--acc)' }}>Confirmed</span>
                ) : (
                  <span className="text-[11px]" style={{ color: 'var(--amber)' }}>Please verify — unconfirmed</span>
                )}
              </div>

              {item.media_type === 'prescription_photo' && item.ai_extracted_data?.medicines && (
                <div className="space-y-1 mb-2">
                  {item.ai_extracted_data.medicines.length === 0 && (
                    <div className="text-xs" style={{ color: 'var(--txt3)' }}>No medicines could be confidently read.</div>
                  )}
                  {item.ai_extracted_data.medicines.map((m, i) => (
                    <div key={i} className="text-sm" style={{ color: 'var(--txt)' }}>
                      {m.medicine_name}{m.dosage ? ` — ${m.dosage}` : ''}{m.frequency ? ` (${m.frequency})` : ''}
                    </div>
                  ))}
                </div>
              )}

              {(item.media_type === 'condition_photo' || item.media_type === 'condition_video') && item.ai_extracted_data?.description && (
                <div className="mb-2">
                  <div className="text-sm" style={{ color: 'var(--txt)' }}>{item.ai_extracted_data.description}</div>
                  {item.ai_extracted_data.differential_considerations && item.ai_extracted_data.differential_considerations.length > 0 && (
                    <div className="mt-1">
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--amber)' }}>AI-suggested, requires physician confirmation:</div>
                      <ul className="list-disc list-inside text-xs" style={{ color: 'var(--txt2)' }}>
                        {item.ai_extracted_data.differential_considerations.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {item.ai_extracted_data?.warnings && item.ai_extracted_data.warnings.length > 0 && (
                <div className="text-[11px] mb-2" style={{ color: 'var(--rose)' }}>{item.ai_extracted_data.warnings.join('; ')}</div>
              )}

              {!item.doctor_confirmed && (
                <AppBtn size="sm" onClick={() => confirm(item.id)}>Confirm This Is Accurate</AppBtn>
              )}
            </div>
          ))}
        </div>
      )}
    </PageCard>
  )
}
