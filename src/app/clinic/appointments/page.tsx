'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'

interface AppointmentRow {
  id: string
  appointment_date: string
  appointment_time: string
  status: string
  reason: string | null
  booked_via: string
  patient_name: string | null
  patient_phone: string | null
  patients: { full_name: string } | null
  doctors: { full_name: string; specialization: string | null } | null
}

interface TimelineReminder {
  id: string
  type: string
  channel: string
  status: string
  response: string | null
  scheduled_at: string
  placed_at: string | null
  ended_at: string | null
  error_message: string | null
  events: { id: string; event_type: string; created_at: string }[]
}

interface PatientOption { id: string; full_name: string; phone?: string }
interface DoctorOption { id: string; full_name: string; specialization?: string | null; department_id?: string | null; departments?: { name: string } | null }

const today = () => new Date().toISOString().split('T')[0]

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [doctors, setDoctors] = useState<DoctorOption[]>([])
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [timelineFor, setTimelineFor] = useState<AppointmentRow | null>(null)
  const [timeline, setTimeline] = useState<TimelineReminder[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [form, setForm] = useState({
    patient_id: '', patient_name_type: '',
    doctor_id: '', appointment_date: today(),
    appointment_time: '', reason: '', notes: '', status: 'confirmed',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/clinic/appointments').then(r => r.json()),
      fetch('/api/clinic/patients').then(r => r.json()),
      fetch('/api/clinic/doctors').then(r => r.json()),
    ]).then(([appts, pats, docs]) => {
      setAppointments(Array.isArray(appts) ? appts : [])
      setPatients(Array.isArray(pats) ? pats : [])
      setDoctors(Array.isArray(docs) ? docs.filter((d: DoctorOption) => d) : [])
    }).finally(() => setLoading(false))
  }, [])

  // Fetch slots when doctor or date changes
  useEffect(() => {
    if (!form.doctor_id || !form.appointment_date || editId) return
    setSlotsLoading(true)
    setSlots([])
    setForm(f => ({ ...f, appointment_time: '' }))
    fetch(`/api/clinic/appointments/slots?doctor_id=${form.doctor_id}&date=${form.appointment_date}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .finally(() => setSlotsLoading(false))
  }, [form.doctor_id, form.appointment_date, editId])

  function openNew() {
    setForm({ patient_id: '', patient_name_type: '', doctor_id: '', appointment_date: today(), appointment_time: '', reason: '', notes: '', status: 'scheduled' })
    setSlots([]); setPatientSearch(''); setEditId(null); setSaveError(''); setOpen(true)
  }

  function openEdit(a: AppointmentRow) {
    setForm({ patient_id: '', patient_name_type: '', doctor_id: '', appointment_date: a.appointment_date, appointment_time: a.appointment_time.slice(0, 5), reason: a.reason || '', notes: '', status: a.status })
    setEditId(a.id); setSaveError(''); setOpen(true)
  }

  async function save() {
    setSaving(true); setSaveError('')
    try {
      if (editId) {
        const res = await fetch(`/api/clinic/appointments/${editId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: form.status, reason: form.reason, appointment_date: form.appointment_date, appointment_time: form.appointment_time + ':00' }),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Update failed'); return }
        setAppointments(prev => prev.map(a => a.id === editId ? data : a))
      } else {
        if (!form.patient_id && !form.patient_name_type.trim()) { setSaveError('Select or type a patient name'); return }
        if (!form.doctor_id) { setSaveError('Select a doctor'); return }
        if (!form.appointment_date) { setSaveError('Select a date'); return }
        if (!form.appointment_time) { setSaveError('Select a time slot'); return }

        // If typed patient name, create patient first
        let patientId = form.patient_id
        if (!patientId && form.patient_name_type.trim()) {
          const pr = await fetch('/api/clinic/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: form.patient_name_type.trim() }),
          })
          const pd = await pr.json()
          if (!pr.ok) { setSaveError(pd.error || 'Could not create patient'); return }
          patientId = pd.id
          setPatients(prev => [...prev, pd])
        }

        const res = await fetch('/api/clinic/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patient_id: patientId, doctor_id: form.doctor_id, appointment_date: form.appointment_date, appointment_time: form.appointment_time, reason: form.reason, notes: form.notes }),
        })
        const data = await res.json()
        if (!res.ok) { setSaveError(data.error || 'Booking failed'); return }
        setAppointments(prev => [data, ...prev])
      }
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function markNoShow(id: string) {
    const res = await fetch(`/api/clinic/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'no_show', no_show_marked_at: new Date().toISOString() }),
    })
    const data = await res.json()
    if (res.ok) setAppointments(prev => prev.map(a => a.id === id ? data : a))
  }

  async function openTimeline(appt: AppointmentRow) {
    setTimelineFor(appt)
    setTimelineLoading(true)
    setTimeline([])
    try {
      const res = await fetch(`/api/clinic/appointments/${appt.id}/timeline`)
      const data = await res.json()
      setTimeline(data.reminders || [])
    } finally {
      setTimelineLoading(false)
    }
  }

  const filtered = statusFilter === 'all' ? appointments : appointments.filter(a => a.status === statusFilter)
  const statuses = ['all', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show']
  const filteredPatients = patients.filter(p => p.full_name.toLowerCase().includes(patientSearch.toLowerCase()) || (p.phone || '').includes(patientSearch))

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="Appointments" subtitle={`${appointments.length} total`}
        actions={<AppBtn icon="+" onClick={openNew}>Book Appointment</AppBtn>} />

      <div className="flex-1 overflow-y-auto p-6">
        <PageCard title="Appointment Schedule" noPad
          actions={
            <div className="flex gap-1.5 flex-wrap">
              {statuses.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize"
                  style={{ background: statusFilter === s ? 'var(--acc-dim)' : 'var(--s3)', border: `1px solid ${statusFilter === s ? 'var(--acc)' : 'var(--b2)'}`, color: statusFilter === s ? 'var(--acc)' : 'var(--txt2)', cursor: 'pointer' }}>
                  {s === 'all' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
          }>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Patient', 'Doctor', 'Date & Time', 'Via', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold"
                    style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((appt, i) => (
                <tr key={appt.id} className="group">
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]" style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{appt.patients?.full_name || appt.patient_name || '—'}</div>
                    {appt.patient_phone && !appt.patients && <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{appt.patient_phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-[12px] group-hover:bg-[rgba(16,185,129,0.05)]" style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none', color: 'var(--txt2)' }}>
                    <div>{appt.doctors?.full_name || '—'}</div>
                    <div className="text-[10px]" style={{ color: 'var(--txt3)' }}>{appt.doctors?.specialization || ''}</div>
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]" style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="text-sm" style={{ color: 'var(--txt)' }}>{appt.appointment_date}</div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{formatTime(appt.appointment_time?.slice(0, 5) || '00:00')}</div>
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]" style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: appt.booked_via === 'ai_voice' ? 'var(--violet-dim)' : 'var(--s3)', color: appt.booked_via === 'ai_voice' ? 'var(--violet)' : 'var(--txt2)' }}>
                      {appt.booked_via === 'ai_voice' ? '🤖 AI Voice' : appt.booked_via}
                    </span>
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]" style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <StatusBadge variant={appt.status} />
                  </td>
                  <td className="px-4 py-3 group-hover:bg-[rgba(16,185,129,0.05)]" style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(228,235,231,1)' : 'none' }}>
                    <div className="flex gap-1.5 flex-wrap">
                      <AppBtn variant="secondary" size="sm" onClick={() => openEdit(appt)}>Update</AppBtn>
                      <AppBtn variant="ghost" size="sm" onClick={() => openTimeline(appt)}>Timeline</AppBtn>
                      {appt.status !== 'no_show' && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <AppBtn variant="ghost" size="sm" onClick={() => markNoShow(appt.id)}>Mark No-Show</AppBtn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-40">📅</div>
                  <p className="text-sm" style={{ color: 'var(--txt3)' }}>No appointments found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </PageCard>
      </div>

      <AppModal open={open} onClose={() => setOpen(false)} title={editId ? 'Update Appointment' : 'Book Appointment'} size="lg"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setOpen(false)}>Cancel</AppBtn>
            <AppBtn onClick={save} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Book'}</AppBtn>
          </>
        }>
        <div className="space-y-4">
          {saveError && (
            <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
              {saveError}
            </div>
          )}

          {!editId && (
            <div className="grid grid-cols-2 gap-4">
              {/* Patient — search existing or type new */}
              <div className="col-span-2">
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--txt2)' }}>
                  Patient <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                <div className="relative">
                  {/* Single smart input */}
                  <div className="flex items-center rounded-lg px-3 py-2.5 gap-2"
                    style={{ background: 'var(--s1)', border: `1.5px solid ${form.patient_id ? 'var(--acc)' : 'var(--b2)'}` }}>
                    <span style={{ color: 'var(--txt3)', fontSize: 14 }}>🔍</span>
                    <input
                      value={form.patient_id ? patientSearch : patientSearch}
                      onChange={e => {
                        setPatientSearch(e.target.value)
                        setForm(f => ({ ...f, patient_id: '', patient_name_type: e.target.value }))
                      }}
                      placeholder="Search by name / phone — or type new patient name"
                      className="flex-1 bg-transparent outline-none text-sm"
                      style={{ color: 'var(--txt)' }}
                    />
                    {form.patient_id && (
                      <button onClick={() => { setPatientSearch(''); setForm(f => ({ ...f, patient_id: '', patient_name_type: '' })) }}
                        style={{ color: 'var(--txt3)', fontSize: 16, lineHeight: 1, cursor: 'pointer', background: 'none', border: 'none' }}>×</button>
                    )}
                  </div>

                  {/* Dropdown — show when typing and no patient selected */}
                  {patientSearch.length > 0 && !form.patient_id && (
                    <div className="absolute left-0 right-0 mt-1 rounded-lg z-50 overflow-hidden"
                      style={{ background: 'var(--s2)', border: '1px solid var(--b2)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: 200, overflowY: 'auto' }}>
                      {filteredPatients.length > 0 && (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Existing Patients</div>
                          {filteredPatients.slice(0, 6).map(p => (
                            <button key={p.id}
                              onClick={() => { setForm(f => ({ ...f, patient_id: p.id, patient_name_type: '' })); setPatientSearch(p.full_name) }}
                              className="w-full text-left px-3 py-2 text-sm transition-colors"
                              style={{ color: 'var(--txt)', display: 'block', background: 'transparent' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.10)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                              <span style={{ fontWeight: 600 }}>{p.full_name}</span>
                              {p.phone && <span style={{ color: 'var(--txt3)', fontSize: 11, marginLeft: 8 }}>{p.phone}</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {/* Always show "add new" option */}
                      <button
                        onClick={() => { setForm(f => ({ ...f, patient_id: '', patient_name_type: patientSearch })); }}
                        className="w-full text-left px-3 py-2.5 text-sm border-t transition-colors"
                        style={{ color: 'var(--acc)', display: 'block', background: 'transparent', borderColor: 'var(--b1)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.07)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        + Add new patient: <strong>&quot;{patientSearch}&quot;</strong>
                      </button>
                    </div>
                  )}

                  {/* Status indicator */}
                  {form.patient_id && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--acc)' }}>✓ Existing patient selected</div>
                  )}
                  {!form.patient_id && form.patient_name_type && patientSearch && (
                    <div className="text-[10px] mt-1" style={{ color: 'var(--txt3)' }}>New patient &quot;{form.patient_name_type}&quot; will be created on booking</div>
                  )}
                </div>
              </div>

              {/* Doctor */}
              <div className="col-span-2">
                <FormField label="Doctor" required>
                  <AppSelect value={form.doctor_id} onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value }))}>
                    <option value="">— Select Doctor —</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name}{d.specialization ? ` — ${d.specialization}` : ''}{d.departments?.name ? ` (${d.departments.name})` : ''}
                      </option>
                    ))}
                  </AppSelect>
                </FormField>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Date — calendar with visible icon */}
            <FormField label="Date" required>
              <div className="relative">
                <input
                  type="date"
                  value={form.appointment_date}
                  min={today()}
                  onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                  required
                  style={{
                    width: '100%', background: 'var(--s1)', border: '1px solid var(--b2)',
                    borderRadius: 8, padding: '10px 40px 10px 14px', color: 'var(--txt)',
                    fontSize: 14, outline: 'none', fontFamily: 'inherit',
                    colorScheme: 'dark',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--acc)'; e.target.style.boxShadow = '0 0 0 3px var(--acc-dim)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--b2)'; e.target.style.boxShadow = 'none' }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16 }}>📅</span>
              </div>
            </FormField>

            {/* Time — slot picker */}
            {!editId ? (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--txt2)' }}>
                  Time Slot <span style={{ color: 'var(--rose)' }}>*</span>
                </label>
                {!form.doctor_id ? (
                  <div className="text-xs py-2" style={{ color: 'var(--txt3)' }}>Select a doctor first</div>
                ) : slotsLoading ? (
                  <div className="text-xs py-2" style={{ color: 'var(--txt3)' }}>Loading slots...</div>
                ) : slots.length === 0 ? (
                  <div className="text-xs py-2" style={{ color: 'var(--rose)' }}>No available slots on this date</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {slots.map(slot => (
                      <button key={slot} onClick={() => setForm(f => ({ ...f, appointment_time: slot }))}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: form.appointment_time === slot ? 'var(--acc)' : 'var(--s3)',
                          border: `1px solid ${form.appointment_time === slot ? 'var(--acc)' : 'var(--b2)'}`,
                          color: form.appointment_time === slot ? '#fff' : 'var(--txt2)',
                          cursor: 'pointer',
                        }}>
                        {formatTime(slot)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <FormField label="Time">
                <AppInput type="time" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} />
              </FormField>
            )}

            {editId && (
              <FormField label="Status">
                <AppSelect value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </AppSelect>
              </FormField>
            )}

            <div className="col-span-2">
              <FormField label="Reason / Notes">
                <AppTextarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} placeholder="Reason for visit..." />
              </FormField>
            </div>
          </div>
        </div>
      </AppModal>

      <AppModal
        open={!!timelineFor}
        onClose={() => setTimelineFor(null)}
        title={`Communication Timeline — ${timelineFor?.patients?.full_name || timelineFor?.patient_name || ''}`}
        size="lg"
      >
        {timelineLoading ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
        ) : timeline.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: 'var(--txt3)' }}>No reminders sent for this appointment yet.</div>
        ) : (
          <div className="space-y-4">
            {timeline.map(r => (
              <div key={r.id} className="rounded-xl p-4" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-semibold capitalize" style={{ color: 'var(--txt)' }}>
                    {r.type.replace(/_/g, ' ')} · {r.channel}
                  </div>
                  <StatusBadge variant={r.status} />
                </div>
                <div className="text-[11px] mb-2" style={{ color: 'var(--txt3)' }}>
                  Scheduled: {new Date(r.scheduled_at).toLocaleString()}
                  {r.response && <> · Response: <span style={{ color: 'var(--acc)' }}>{r.response}</span></>}
                </div>
                {r.error_message && (
                  <div className="text-[11px] mb-2" style={{ color: 'var(--rose)' }}>{r.error_message}</div>
                )}
                {r.events.length > 0 && (
                  <div className="flex flex-col gap-1 mt-2 pl-3" style={{ borderLeft: '2px solid var(--b2)' }}>
                    {r.events.map(e => (
                      <div key={e.id} className="text-[11px]" style={{ color: 'var(--txt2)' }}>
                        <span className="capitalize font-medium">{e.event_type}</span> — {new Date(e.created_at).toLocaleString()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </AppModal>
    </div>
  )
}
