'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import type { Doctor, DoctorAvailability } from '@/types/database'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface DoctorWithAvailability extends Doctor {
  doctor_availability: DoctorAvailability[]
  departments?: { name: string } | null
}

export default function AvailabilityPage() {
  const [doctors, setDoctors] = useState<DoctorWithAvailability[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<Record<string, string>>({})
  const [localAvail, setLocalAvail] = useState<Record<string, DoctorAvailability[]>>({})

  useEffect(() => {
    fetch('/api/clinic/availability')
      .then(r => r.json())
      .then(data => {
        const docs = Array.isArray(data) ? data : []
        setDoctors(docs)
        const avail: Record<string, DoctorAvailability[]> = {}
        docs.forEach((d: DoctorWithAvailability) => { avail[d.id] = d.doctor_availability || [] })
        setLocalAvail(avail)
      })
  }, [])

  function getAvail(docId: string, day: number) {
    return (localAvail[docId] || []).find(a => a.day_of_week === day)
  }

  function toggleDay(docId: string, day: number) {
    const existing = getAvail(docId, day)
    setLocalAvail(prev => {
      const avails = [...(prev[docId] || [])]
      if (existing) {
        return { ...prev, [docId]: avails.map(a => a.day_of_week === day ? { ...a, is_available: !a.is_available } : a) }
      } else {
        return {
          ...prev, [docId]: [...avails, {
            id: `new-${docId}-${day}`, doctor_id: docId, day_of_week: day,
            start_time: '09:00', end_time: '17:00', is_available: true, created_at: ''
          }]
        }
      }
    })
  }

  function updateTime(docId: string, day: number, field: 'start_time' | 'end_time', value: string) {
    setLocalAvail(prev => {
      const avails = [...(prev[docId] || [])]
      return { ...prev, [docId]: avails.map(a => a.day_of_week === day ? { ...a, [field]: value } : a) }
    })
  }

  async function saveDoctor(docId: string) {
    setSaving(docId)
    setSaveError(prev => ({ ...prev, [docId]: '' }))

    // Build all 7 days — days not in localAvail get is_available: false
    const avails = localAvail[docId] || []
    const payload = Array.from({ length: 7 }, (_, day) => {
      const existing = avails.find(a => a.day_of_week === day)
      return {
        day_of_week: day,
        start_time: existing?.start_time || '09:00',
        end_time: existing?.end_time || '17:00',
        is_available: existing?.is_available ?? false,
      }
    })

    const res = await fetch('/api/clinic/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: docId, availability: payload }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSaveError(prev => ({ ...prev, [docId]: data.error || 'Save failed' }))
    }
    setSaving(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Doctor Availability" subtitle="Set weekly schedules for each doctor" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {doctors.map(doc => (
          <PageCard key={doc.id}
            title={doc.full_name}
            subtitle={`${doc.departments?.name || 'No dept'} · ${doc.specialization || '—'}`}
            actions={
              <AppBtn size="sm" onClick={() => saveDoctor(doc.id)} disabled={saving === doc.id}>
                {saving === doc.id ? 'Saving...' : 'Save Schedule'}
              </AppBtn>
            }>
            {saveError[doc.id] && (
              <div className="mb-3 rounded-lg px-4 py-2 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
                {saveError[doc.id]}
              </div>
            )}
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, dayNum) => {
                const avail = getAvail(doc.id, dayNum)
                const isOn = avail?.is_available ?? false
                return (
                  <div key={day} className="rounded-xl p-3 text-center transition-all"
                    style={{
                      background: isOn ? 'var(--acc-dim)' : 'var(--s3)',
                      border: `1px solid ${isOn ? 'var(--acc)' : 'var(--b2)'}`,
                    }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest mb-2"
                      style={{ color: isOn ? 'var(--acc)' : 'var(--txt3)' }}>
                      {day}
                    </div>
                    <button
                      onClick={() => toggleDay(doc.id, dayNum)}
                      className="w-full rounded-lg py-1.5 text-[11px] font-semibold mb-2 transition-all"
                      style={{
                        background: isOn ? 'var(--acc)' : 'var(--s4)',
                        color: isOn ? '#fff' : 'var(--txt3)',
                        border: 'none', cursor: 'pointer',
                      }}>
                      {isOn ? 'ON' : 'OFF'}
                    </button>
                    {isOn && avail && (
                      <div className="space-y-1">
                        <input type="time" value={avail.start_time} onChange={e => updateTime(doc.id, dayNum, 'start_time', e.target.value)}
                          className="w-full rounded text-[10px] px-1 py-0.5 text-center"
                          style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }} />
                        <input type="time" value={avail.end_time} onChange={e => updateTime(doc.id, dayNum, 'end_time', e.target.value)}
                          className="w-full rounded text-[10px] px-1 py-0.5 text-center"
                          style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </PageCard>
        ))}
        {doctors.length === 0 && (
          <div className="flex flex-col items-center py-20">
            <div className="text-4xl mb-3 opacity-40">📅</div>
            <p className="text-sm" style={{ color: 'var(--txt3)' }}>No active doctors found. Add doctors first.</p>
          </div>
        )}
      </div>
    </div>
  )
}
