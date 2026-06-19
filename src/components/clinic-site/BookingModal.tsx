'use client'

import { useState, useEffect } from 'react'

interface Doctor {
  id: string
  full_name: string
  specialization: string | null
  booking_max_days: number
  slot_duration_minutes: number
}

interface Props {
  doctor: Doctor
  clinicSlug: string
  onClose: () => void
  accent: string
}

type Step = 'date' | 'slot' | 'details' | 'confirm' | 'done'

export default function BookingModal({ doctor, clinicSlug, onClose, accent }: Props) {
  const [step, setStep] = useState<Step>('date')
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Min date = today, Max date = booking_max_days from today
  const today = new Date().toISOString().split('T')[0]
  const maxDate = new Date(Date.now() + doctor.booking_max_days * 86400000).toISOString().split('T')[0]

  useEffect(() => {
    if (step === 'slot' && selectedDate) {
      setLoadingSlots(true)
      setSlots([])
      fetch(`/api/public/clinic/${clinicSlug}/slots?doctor_id=${doctor.id}&date=${selectedDate}`)
        .then(r => r.json())
        .then(data => setSlots(data.slots || []))
        .finally(() => setLoadingSlots(false))
    }
  }, [step, selectedDate, doctor.id, clinicSlug])

  async function submitBooking() {
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/public/clinic/${clinicSlug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctor.id,
          appointment_date: selectedDate,
          appointment_time: selectedSlot,
          patient_name: form.name,
          patient_phone: form.phone,
          patient_email: form.email || undefined,
          notes: form.notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Booking failed. Please try again.')
        return
      }
      setStep('done')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
  }

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${suffix}`
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px',
          borderBottom: '1px solid #e4ebe7',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Book Appointment</h2>
            <p style={{ margin: '4px 0 0', color: '#4b5d54', fontSize: 14 }}>
              {doctor.full_name} {doctor.specialization ? `· ${doctor.specialization}` : ''}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#7a8d83', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'done' && (
          <div style={{ padding: '16px 24px', display: 'flex', gap: 6 }}>
            {(['date', 'slot', 'details', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} style={{
                flex: 1, height: 4, borderRadius: 100,
                background: ['date', 'slot', 'details', 'confirm', 'done'].indexOf(step) >= i ? accent : '#e4ebe7',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        )}

        <div style={{ padding: '8px 24px 24px' }}>

          {/* ─── STEP: Date ─── */}
          {step === 'date' && (
            <div>
              <p style={{ color: '#4b5d54', fontSize: 14, marginBottom: 16 }}>
                Select an appointment date
              </p>
              <input
                type="date"
                min={today}
                max={maxDate}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: '1.5px solid #e4ebe7', fontSize: 16,
                  outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit', color: '#0f1f17',
                }}
              />
              <button
                onClick={() => setStep('slot')}
                disabled={!selectedDate}
                style={{
                  width: '100%', marginTop: 16, padding: '13px 0',
                  background: selectedDate ? accent : '#e4ebe7',
                  color: selectedDate ? '#fff' : '#7a8d83',
                  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                  cursor: selectedDate ? 'pointer' : 'not-allowed',
                }}>
                See Available Slots →
              </button>
            </div>
          )}

          {/* ─── STEP: Slot ─── */}
          {step === 'slot' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ color: '#4b5d54', fontSize: 14, margin: 0 }}>
                  {formatDate(selectedDate)}
                </p>
                <button onClick={() => setStep('date')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 13, fontWeight: 600 }}>
                  ← Change date
                </button>
              </div>

              {loadingSlots ? (
                <p style={{ textAlign: 'center', color: '#7a8d83', padding: '32px 0' }}>Loading slots…</p>
              ) : slots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>😔</div>
                  <p style={{ color: '#7a8d83' }}>No slots available on this date.</p>
                  <button onClick={() => setStep('date')}
                    style={{ marginTop: 12, background: 'none', border: `1.5px solid ${accent}`, cursor: 'pointer', color: accent, padding: '8px 20px', borderRadius: 8, fontWeight: 600 }}>
                    Choose another date
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {slots.map(slot => (
                      <button key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '10px 8px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: selectedSlot === slot ? accent : '#f1f5f3',
                          color: selectedSlot === slot ? '#fff' : '#0f1f17',
                          border: selectedSlot === slot ? `2px solid ${accent}` : '2px solid transparent',
                        }}>
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep('details')}
                    disabled={!selectedSlot}
                    style={{
                      width: '100%', marginTop: 20, padding: '13px 0',
                      background: selectedSlot ? accent : '#e4ebe7',
                      color: selectedSlot ? '#fff' : '#7a8d83',
                      border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                      cursor: selectedSlot ? 'pointer' : 'not-allowed',
                    }}>
                    Continue →
                  </button>
                </>
              )}
            </div>
          )}

          {/* ─── STEP: Patient Details ─── */}
          {step === 'details' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ color: '#4b5d54', fontSize: 14, margin: 0 }}>
                  {formatDate(selectedDate)} at {formatTime(selectedSlot)}
                </p>
                <button onClick={() => setStep('slot')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, fontSize: 13, fontWeight: 600 }}>
                  ← Change
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Full Name *">
                  <Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Your full name" accent={accent} />
                </Field>
                <Field label="Phone Number *">
                  <Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+91 9000000000" type="tel" accent={accent} />
                </Field>
                <Field label="Email (optional)">
                  <Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="email@example.com" type="email" accent={accent} />
                </Field>
                <Field label="Notes (optional)">
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Symptoms or reason for visit…"
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
                      border: '1.5px solid #e4ebe7', fontFamily: 'inherit',
                      resize: 'none', outline: 'none', boxSizing: 'border-box', color: '#0f1f17',
                    }}
                  />
                </Field>
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>}
              <button
                onClick={() => { setError(''); if (!form.name.trim() || !form.phone.trim()) { setError('Name and phone are required'); return; } setStep('confirm') }}
                style={{
                  width: '100%', marginTop: 20, padding: '13px 0',
                  background: accent, color: '#fff',
                  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}>
                Review Booking →
              </button>
            </div>
          )}

          {/* ─── STEP: Confirm ─── */}
          {step === 'confirm' && (
            <div>
              <div style={{ background: '#f8fafb', borderRadius: 12, padding: 20, marginBottom: 20, border: '1px solid #e4ebe7' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Booking Summary</h3>
                <Row label="Doctor" value={doctor.full_name} />
                {doctor.specialization && <Row label="Specialization" value={doctor.specialization} />}
                <Row label="Date" value={formatDate(selectedDate)} />
                <Row label="Time" value={formatTime(selectedSlot)} />
                <Row label="Patient" value={form.name} />
                <Row label="Phone" value={form.phone} />
                {form.email && <Row label="Email" value={form.email} />}
                {form.notes && <Row label="Notes" value={form.notes} />}
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('details')}
                  style={{
                    flex: 1, padding: '13px 0', background: '#f1f5f3', color: '#4b5d54',
                    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  }}>
                  ← Edit
                </button>
                <button onClick={submitBooking} disabled={submitting}
                  style={{
                    flex: 2, padding: '13px 0', background: accent, color: '#fff',
                    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}>
                  {submitting ? 'Confirming…' : 'Confirm Booking ✓'}
                </button>
              </div>
            </div>
          )}

          {/* ─── STEP: Done ─── */}
          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: `${accent}15`, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 32, margin: '0 auto 20px',
              }}>
                ✅
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>Booking Confirmed!</h3>
              <p style={{ color: '#4b5d54', fontSize: 15, marginBottom: 8 }}>
                Your appointment with <strong>{doctor.full_name}</strong> is scheduled for:
              </p>
              <p style={{ color: accent, fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
                {formatDate(selectedDate)} at {formatTime(selectedSlot)}
              </p>
              <p style={{ color: '#7a8d83', fontSize: 13, marginBottom: 24 }}>
                Please arrive 10 minutes early. You may receive a confirmation call.
              </p>
              <button onClick={onClose}
                style={{
                  background: accent, color: '#fff', border: 'none', cursor: 'pointer',
                  padding: '12px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700,
                }}>
                Done
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4b5d54', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', accent }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; accent: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 14,
        border: '1.5px solid #e4ebe7', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box', color: '#0f1f17',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => (e.target.style.borderColor = accent)}
      onBlur={e => (e.target.style.borderColor = '#e4ebe7')}
    />
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 14 }}>
      <span style={{ color: '#7a8d83', fontWeight: 500 }}>{label}</span>
      <span style={{ color: '#0f1f17', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}
