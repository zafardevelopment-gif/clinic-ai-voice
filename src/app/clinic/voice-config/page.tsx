'use client'

import { useEffect, useRef, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const VOICES = [
  { id: 'priya',  label: 'Priya',  sub: 'Hindi · Female',   emoji: '👩' },
  { id: 'meera',  label: 'Meera',  sub: 'Hindi · Female',   emoji: '👩' },
  { id: 'anjali', label: 'Anjali', sub: 'Hindi · Female',   emoji: '👩' },
  { id: 'arjun',  label: 'Arjun',  sub: 'Hindi · Male',     emoji: '👨' },
  { id: 'rahul',  label: 'Rahul',  sub: 'Hindi · Male',     emoji: '👨' },
  { id: 'vikram', label: 'Vikram', sub: 'Hindi · Male',     emoji: '👨' },
  { id: 'riya',   label: 'Riya',   sub: 'English · Female', emoji: '👩' },
  { id: 'david',  label: 'David',  sub: 'English · Male',   emoji: '👨' },
]

const LANGUAGES = [
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ur-PK', label: 'Urdu' },
]

const TONES = [
  'warm and professional',
  'friendly and casual',
  'formal and concise',
  'empathetic and reassuring',
]

const WORKING_HOURS: Record<number, { label: string; start: string; end: string; open: boolean }> = {
  1: { label: 'Monday',    start: '09:00', end: '20:00', open: true },
  2: { label: 'Tuesday',   start: '09:00', end: '20:00', open: true },
  3: { label: 'Wednesday', start: '09:00', end: '20:00', open: true },
  4: { label: 'Thursday',  start: '09:00', end: '20:00', open: true },
  5: { label: 'Friday',    start: '09:00', end: '20:00', open: true },
  6: { label: 'Saturday',  start: '10:00', end: '14:00', open: true },
  0: { label: 'Sunday',    start: '09:00', end: '18:00', open: false },
}

type DaySchedule = { start: string; end: string; open: boolean }

export default function VoiceConfigPage() {
  const [tab, setTab] = useState<'dashboard' | 'setup' | 'test' | 'logs'>('setup')
  const [configId, setConfigId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Test-AI chat state
  const [chat, setChat] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)

  // Voice sample preview
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function playSample(voiceId: string) {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (playingVoice === voiceId) { setPlayingVoice(null); return }
    const audio = new Audio(`/api/clinic/voice-config/voice-sample?voice=${voiceId}`)
    audioRef.current = audio
    setPlayingVoice(voiceId)
    audio.onended = () => setPlayingVoice(null)
    audio.onerror = () => setPlayingVoice(null)
    audio.play().catch(() => setPlayingVoice(null))
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatBusy) return
    const next = [...chat, { role: 'user' as const, content: text }]
    setChat(next)
    setChatInput('')
    setChatBusy(true)
    try {
      const res = await fetch('/api/clinic/voice-config/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setChat([...next, { role: 'assistant', content: res.ok ? data.reply : (data.error || 'AI unavailable') }])
    } catch {
      setChat([...next, { role: 'assistant', content: 'Network error — try again.' }])
    } finally {
      setChatBusy(false)
    }
  }

  const [config, setConfig] = useState({
    is_enabled: false,
    voice_type: 'priya',
    language: 'hi-IN',
    secondary_language: 'en-US',
    auto_detect_language: true,
    greeting_hi: 'नमस्ते! HeartCare Plus में आपका स्वागत है। मैं Priya हूँ, आपकी AI रिसेप्शनिस्ट। मैं आज आपकी किस प्रकार सहायता कर सकती हूँ? आप अपॉइंटमेंट बुक कर सकते हैं या डॉक्टर के बारे में जानकारी ले सकते हैं।',
    greeting_en: 'Hello! Welcome to HeartCare Plus. I\'m Priya, your AI receptionist. How may I assist you today? You can book an appointment, ask about our doctors, or inquire about timings.',
    working_days: [1, 2, 3, 4, 5, 6] as number[],
    day_schedules: { ...WORKING_HOURS } as Record<number, DaySchedule>,
    max_call_duration_seconds: 300,
    fallback_phone: '',
    booking_rules: {
      min_hours_ahead: 2,
      max_days_ahead: 30,
      allow_same_day: false,
      confirmation_sms: true,
      allow_reschedule: true,
      allow_cancel: false,
      slot_duration_minutes: 20,
      doctor_selection: 'auto_department',
      tone: 'warm and professional',
      custom_instructions: '',
      // Which doctor details the AI is allowed to tell patients on a call.
      share_doctor_info: {
        specialization: true,
        experience: true,
        qualifications: true,
        fee: true,
        languages: true,
      },
    },
    ai_knowledge: {
      clinic_name: '',
      specialties: '',
      common_symptoms: 'Pet dard (stomach pain) → General Surgery / Gastroenterology\nSaas ki takleef (breathing issues) → Pulmonology\nDil ki takleef (chest pain) → Cardiology\nHaddi dard (bone pain) → Orthopedics\nBukhaar (fever) → General Medicine\nAankh ki takleef (eye issues) → Ophthalmology\nBachon ki bimari (child illness) → Pediatrics',
      faqs: 'Q: Kitne bajay clinic khulti hai?\nA: Somwar se Shukravar 9AM-8PM, Shanivar 10AM-2PM\n\nQ: Kya same day appointment milti hai?\nA: Haan, availability ke hisab se\n\nQ: Fees kitni hai?\nA: Doctor ke hisab se alag hoti hai, booking ke time batai jaati hai',
    },
  })

  useEffect(() => {
    fetch('/api/clinic/voice-config')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setConfigId(data.id)
          const br = data.booking_rules || {}
          const ak = data.ai_knowledge || {}
          setConfig(prev => ({
            ...prev,
            is_enabled: data.is_enabled,
            voice_type: data.voice_type || 'priya',
            language: data.language || 'hi-IN',
            working_days: data.working_days || [1,2,3,4,5,6],
            max_call_duration_seconds: data.max_call_duration_seconds || 300,
            fallback_phone: data.fallback_phone || '',
            greeting_hi: br.greeting_hi || prev.greeting_hi,
            greeting_en: data.greeting_message || prev.greeting_en,
            booking_rules: { ...prev.booking_rules, ...br },
            ai_knowledge: { ...prev.ai_knowledge, ...ak },
          }))
        }
      })
  }, [])

  async function handleSave() {
    setSaving(true); setSaveError('')
    // Derive the overall open window from the enabled days' schedules: earliest
    // start and latest end. The backend uses these flat fields for the
    // working-hours check, so they must reflect what the user set in the UI.
    const enabled = config.working_days
    const starts = enabled.map(d => config.day_schedules[d]?.start).filter(Boolean) as string[]
    const ends = enabled.map(d => config.day_schedules[d]?.end).filter(Boolean) as string[]
    const earliestStart = starts.length ? starts.sort()[0] : '09:00'
    const latestEnd = ends.length ? ends.sort()[ends.length - 1] : '20:00'
    const body = {
      is_enabled: config.is_enabled,
      voice_type: config.voice_type,
      language: config.language,
      greeting_message: config.greeting_en,
      working_hours_start: earliestStart,
      working_hours_end: latestEnd,
      working_days: config.working_days,
      max_call_duration_seconds: config.max_call_duration_seconds,
      fallback_phone: config.fallback_phone || null,
      booking_rules: {
        ...config.booking_rules,
        greeting_hi: config.greeting_hi,
        greeting_en: config.greeting_en,
        day_schedules: config.day_schedules,
      },
      ai_knowledge: config.ai_knowledge,
    }
    try {
      const res = await fetch('/api/clinic/voice-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error || 'Save failed'); return }
      if (!configId) setConfigId(data.id)
      setSaved(true); setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // Quick presets for working hours.
  function setAllDay() {
    setConfig(c => {
      const ds = { ...c.day_schedules }
      for (const d of Object.keys(ds).map(Number)) ds[d] = { ...ds[d], start: '00:00', end: '23:59' }
      return { ...c, working_days: [0, 1, 2, 3, 4, 5, 6], day_schedules: ds }
    })
  }

  function setOfficeHours() {
    setConfig(c => {
      const ds = { ...c.day_schedules }
      for (const d of Object.keys(ds).map(Number)) {
        ds[d] = { ...ds[d], start: d === 0 ? '00:00' : '09:00', end: d === 0 ? '00:00' : '18:00' }
      }
      return { ...c, working_days: [1, 2, 3, 4, 5, 6], day_schedules: ds }
    })
  }

  function toggleDay(day: number) {
    setConfig(c => ({
      ...c,
      working_days: c.working_days.includes(day) ? c.working_days.filter(d => d !== day) : [...c.working_days, day].sort(),
    }))
  }

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <label style={{ width: 42, height: 24, cursor: 'pointer', position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="opacity-0 absolute" />
      <div style={{ position: 'absolute', inset: 0, borderRadius: 999, background: checked ? 'var(--acc)' : 'var(--s4)', border: `1px solid ${checked ? 'var(--acc)' : 'var(--b3)'}`, transition: 'all 0.2s' }}>
        <div style={{ position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%', background: checked ? '#fff' : 'var(--txt3)', left: checked ? 23 : 3, transition: 'all 0.2s' }} />
      </div>
    </label>
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Tab header */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-0" style={{ borderBottom: '1px solid var(--b1)' }}>
        {(['dashboard', 'setup', 'test', 'logs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-t-lg capitalize transition-all"
            style={{ background: tab === t ? 'var(--acc-dim)' : 'transparent', color: tab === t ? 'var(--acc)' : 'var(--txt3)', borderBottom: tab === t ? '2px solid var(--acc)' : '2px solid transparent', cursor: 'pointer' }}>
            {t === 'dashboard' ? '🎛 AI Dashboard' : t === 'setup' ? '⚙️ AI Setup' : t === 'test' ? '🧪 Test AI' : '📞 Call Logs'}
          </button>
        ))}
        <div className="ml-auto">
          {tab === 'setup' && (
            <AppBtn onClick={handleSave} disabled={saving}>
              {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Configuration'}
            </AppBtn>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {saveError && (
          <div className="mb-4 rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
            {saveError}
          </div>
        )}

        {tab === 'dashboard' && (
          <div className="space-y-4">
            {/* Agent Status Card */}
            <PageCard title="AI Receptionist Control" subtitle="Enable or disable your AI voice agent">
              <div className="flex items-center justify-between rounded-xl p-4"
                style={{ background: 'var(--s1)', border: `1px solid ${config.is_enabled ? 'rgba(0,212,170,0.3)' : 'var(--b2)'}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>AI Voice Agent</div>
                  <div className="text-xs mt-0.5" style={{ color: config.is_enabled ? 'var(--acc)' : 'var(--txt2)' }}>
                    {config.is_enabled ? 'Active — Handling Live Calls' : 'Inactive — Not Handling Calls'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {config.is_enabled && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,212,170,0.15)', color: 'var(--acc)' }}>● Live</span>}
                  <Toggle checked={config.is_enabled} onChange={v => setConfig(c => ({ ...c, is_enabled: v }))} />
                </div>
              </div>
            </PageCard>

            {/* Voice Selection */}
            <PageCard title="Voice Selection" subtitle="Choose your AI receptionist's voice">
              <p className="text-xs mb-3" style={{ color: 'var(--txt3)' }}>
                Sample sun kar voice choose karein. Selected voice hi calls par istemal hogi.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {VOICES.map(v => {
                  const selected = config.voice_type === v.id
                  return (
                    <div key={v.id}
                      onClick={() => setConfig(c => ({ ...c, voice_type: v.id }))}
                      className="rounded-xl p-4 text-center transition-all cursor-pointer relative"
                      style={{ background: selected ? 'var(--acc-dim)' : 'var(--s3)', border: `1.5px solid ${selected ? 'var(--acc)' : 'var(--b2)'}` }}>
                      <div className="text-2xl mb-1">{v.emoji}</div>
                      <div className="text-sm font-semibold" style={{ color: selected ? 'var(--acc)' : 'var(--txt)' }}>{v.label}</div>
                      <div className="text-[10px] mb-2" style={{ color: 'var(--txt3)' }}>{v.sub}</div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); playSample(v.id) }}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt2)', cursor: 'pointer' }}>
                        {playingVoice === v.id ? '⏸ Playing…' : '▶ Sample'}
                      </button>
                      {selected && (
                        <div className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--acc)', color: '#fff' }}>✓</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </PageCard>

            {/* Language Settings */}
            <PageCard title="Language Settings">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <FormField label="Primary Language">
                  <AppSelect value={config.language} onChange={e => setConfig(c => ({ ...c, language: e.target.value }))}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </AppSelect>
                </FormField>
                <FormField label="Secondary Language">
                  <AppSelect value={config.secondary_language} onChange={e => setConfig(c => ({ ...c, secondary_language: e.target.value }))}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </AppSelect>
                </FormField>
              </div>
              <div className="flex items-center gap-3">
                <Toggle checked={config.auto_detect_language} onChange={v => setConfig(c => ({ ...c, auto_detect_language: v }))} />
                <span className="text-sm" style={{ color: 'var(--txt2)' }}>Detect caller's language automatically</span>
              </div>
            </PageCard>

            <div className="pt-2">
              <AppBtn onClick={handleSave} disabled={saving}>
                {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Changes'}
              </AppBtn>
            </div>
          </div>
        )}

        {tab === 'setup' && (
          <div className="grid grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              {/* Greeting Messages */}
              <PageCard title="Greeting Messages" subtitle="What the AI says when a call connects">
                <FormField label="English Greeting">
                  <AppTextarea value={config.greeting_en} onChange={e => setConfig(c => ({ ...c, greeting_en: e.target.value }))} rows={4} />
                </FormField>
                <div className="mt-3">
                  <FormField label="Hindi Greeting">
                    <AppTextarea value={config.greeting_hi} onChange={e => setConfig(c => ({ ...c, greeting_hi: e.target.value }))} rows={4} />
                  </FormField>
                </div>
                <div className="mt-3">
                  <AppBtn size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Greetings'}</AppBtn>
                </div>
              </PageCard>

              {/* AI Knowledge Base */}
              <PageCard title="AI Knowledge Base" subtitle="Help AI answer patient queries intelligently">
                <FormField label="Clinic Name">
                  <AppInput value={config.ai_knowledge.clinic_name} onChange={e => setConfig(c => ({ ...c, ai_knowledge: { ...c.ai_knowledge, clinic_name: e.target.value } }))} placeholder="e.g. HeartCare Plus Clinic" />
                </FormField>
                <div className="mt-3">
                  <FormField label="Specialties / Departments" hint="List your departments so AI can guide patients">
                    <AppInput value={config.ai_knowledge.specialties} onChange={e => setConfig(c => ({ ...c, ai_knowledge: { ...c.ai_knowledge, specialties: e.target.value } }))} placeholder="Cardiology, General Surgery, Pediatrics..." />
                  </FormField>
                </div>
                <div className="mt-3">
                  <FormField label="Symptom → Department Mapping" hint="AI uses this to guide patients to right doctor">
                    <AppTextarea value={config.ai_knowledge.common_symptoms} onChange={e => setConfig(c => ({ ...c, ai_knowledge: { ...c.ai_knowledge, common_symptoms: e.target.value } }))} rows={8} placeholder="Pet dard → General Surgery&#10;Chest pain → Cardiology" />
                  </FormField>
                </div>
                <div className="mt-3">
                  <FormField label="FAQs (Q: ... A: ... format)" hint="Common questions patients ask">
                    <AppTextarea value={config.ai_knowledge.faqs} onChange={e => setConfig(c => ({ ...c, ai_knowledge: { ...c.ai_knowledge, faqs: e.target.value } }))} rows={6} />
                  </FormField>
                </div>
              </PageCard>

              {/* AI Personality */}
              <PageCard title="AI Personality" subtitle="Control how the AI sounds and behaves on calls">
                <FormField label="Tone" hint="How the AI should sound to callers">
                  <AppSelect
                    value={config.booking_rules.tone}
                    onChange={e => setConfig(c => ({ ...c, booking_rules: { ...c.booking_rules, tone: e.target.value } }))}
                  >
                    {TONES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </AppSelect>
                </FormField>
                <div className="mt-3">
                  <FormField label="Custom Instructions" hint="Extra rules for the AI — e.g. 'Always mention free parking', 'Don't quote fees', 'Offer teleconsultation'">
                    <AppTextarea
                      value={config.booking_rules.custom_instructions}
                      onChange={e => setConfig(c => ({ ...c, booking_rules: { ...c.booking_rules, custom_instructions: e.target.value } }))}
                      rows={4}
                      placeholder="Always greet by clinic name. If asked about fees, say the front desk will confirm. Encourage morning slots."
                    />
                  </FormField>
                </div>
              </PageCard>

              {/* Doctor Info AI Can Share */}
              <PageCard title="Doctor Info AI Can Share" subtitle="Choose which doctor details the AI tells patients on calls">
                <div className="space-y-3">
                  {[
                    { key: 'specialization', label: 'Specialization', sub: 'e.g. Cardiologist' },
                    { key: 'experience', label: 'Years of Experience', sub: 'e.g. 10 years' },
                    { key: 'qualifications', label: 'Qualifications', sub: 'e.g. MBBS, MD' },
                    { key: 'fee', label: 'Consultation Fee', sub: 'e.g. Rs 500 — turn off to keep fees private' },
                    { key: 'languages', label: 'Languages Spoken', sub: 'e.g. Hindi, Urdu, English' },
                  ].map(item => {
                    const sdi = config.booking_rules.share_doctor_info as Record<string, boolean>
                    return (
                      <div key={item.key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--b1)' }}>
                        <div>
                          <div className="text-sm" style={{ color: 'var(--txt)' }}>{item.label}</div>
                          <div className="text-xs" style={{ color: 'var(--txt3)' }}>{item.sub}</div>
                        </div>
                        <Toggle
                          checked={sdi?.[item.key] ?? true}
                          onChange={v => setConfig(c => ({
                            ...c,
                            booking_rules: {
                              ...c.booking_rules,
                              share_doctor_info: { ...c.booking_rules.share_doctor_info, [item.key]: v },
                            },
                          }))}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3">
                  <AppBtn size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save'}</AppBtn>
                </div>
              </PageCard>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Working Hours */}
              <PageCard title="Working Hours" subtitle="When AI Agent handles calls">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Quick set:</span>
                  <button onClick={setAllDay} type="button"
                    className="px-3 py-1 rounded-md text-xs font-semibold"
                    style={{ background: 'var(--acc-dim)', border: '1px solid var(--acc)', color: 'var(--acc)', cursor: 'pointer' }}>
                    🕐 All Day (24/7)
                  </button>
                  <button onClick={setOfficeHours} type="button"
                    className="px-3 py-1 rounded-md text-xs font-semibold"
                    style={{ background: 'var(--s3)', border: '1px solid var(--b2)', color: 'var(--txt2)', cursor: 'pointer' }}>
                    🏢 Mon–Sat 9–6
                  </button>
                </div>
                <div className="space-y-2">
                  {Object.entries(config.day_schedules).map(([dayNum, sched]) => {
                    const d = Number(dayNum)
                    const isOn = config.working_days.includes(d)
                    return (
                      <div key={d} className="flex items-center gap-3 rounded-lg px-3 py-2"
                        style={{ background: 'var(--s1)', border: '1px solid var(--b2)' }}>
                        <div className="w-24 text-sm font-medium" style={{ color: 'var(--txt)' }}>{WORKING_HOURS[d]?.label}</div>
                        {isOn ? (
                          <>
                            <input type="time" value={sched.start} onChange={e => setConfig(c => ({ ...c, day_schedules: { ...c.day_schedules, [d]: { ...c.day_schedules[d], start: e.target.value } } }))}
                              className="rounded text-xs px-2 py-1 outline-none w-24"
                              style={{ background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--txt)' }} />
                            <span className="text-xs" style={{ color: 'var(--txt3)' }}>—</span>
                            <input type="time" value={sched.end} onChange={e => setConfig(c => ({ ...c, day_schedules: { ...c.day_schedules, [d]: { ...c.day_schedules[d], end: e.target.value } } }))}
                              className="rounded text-xs px-2 py-1 outline-none w-24"
                              style={{ background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--txt)' }} />
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--txt3)' }}>Closed</span>
                        )}
                        <div className="ml-auto">
                          <Toggle checked={isOn} onChange={() => toggleDay(d)} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </PageCard>

              {/* Booking Rules */}
              <PageCard title="Booking Rules" subtitle="Control how AI books appointments">
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--b1)' }}>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--txt)' }}>Booking Window</div>
                      <div className="text-xs" style={{ color: 'var(--txt3)' }}>Same-day to {config.booking_rules.max_days_ahead} days ahead</div>
                    </div>
                    <div className="flex gap-2">
                      <AppInput type="number" min={0} value={config.booking_rules.min_hours_ahead}
                        onChange={e => setConfig(c => ({ ...c, booking_rules: { ...c.booking_rules, min_hours_ahead: Number(e.target.value) } }))}
                        style={{ width: 64 }} />
                      <AppInput type="number" min={1} value={config.booking_rules.max_days_ahead}
                        onChange={e => setConfig(c => ({ ...c, booking_rules: { ...c.booking_rules, max_days_ahead: Number(e.target.value) } }))}
                        style={{ width: 64 }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--b1)' }}>
                    <div>
                      <div className="text-sm" style={{ color: 'var(--txt)' }}>Slot Duration</div>
                      <div className="text-xs" style={{ color: 'var(--txt3)' }}>{config.booking_rules.slot_duration_minutes} minutes per appointment</div>
                    </div>
                    <AppSelect value={String(config.booking_rules.slot_duration_minutes)} onChange={e => setConfig(c => ({ ...c, booking_rules: { ...c.booking_rules, slot_duration_minutes: Number(e.target.value) } }))} style={{ width: 120 }}>
                      <option value="15">15 min</option>
                      <option value="20">20 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                    </AppSelect>
                  </div>

                  {[
                    { key: 'confirmation_sms', label: 'Confirmation SMS', sub: 'Send after successful booking' },
                    { key: 'allow_reschedule', label: 'Reschedule via AI', sub: 'Allow patients to reschedule' },
                    { key: 'allow_cancel', label: 'Cancel via AI', sub: 'Allow patients to cancel' },
                    { key: 'allow_same_day', label: 'Same-day Booking', sub: 'Allow booking for today' },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid var(--b1)' }}>
                      <div>
                        <div className="text-sm" style={{ color: 'var(--txt)' }}>{item.label}</div>
                        <div className="text-xs" style={{ color: 'var(--txt3)' }}>{item.sub}</div>
                      </div>
                      <Toggle
                        checked={!!config.booking_rules[item.key as keyof typeof config.booking_rules]}
                        onChange={v => setConfig(c => ({ ...c, booking_rules: { ...c.booking_rules, [item.key]: v } }))}
                      />
                    </div>
                  ))}

                  <div className="pt-2 flex items-center gap-3">
                    <FormField label="Fallback Phone">
                      <AppInput value={config.fallback_phone} onChange={e => setConfig(c => ({ ...c, fallback_phone: e.target.value }))} placeholder="+91 300 0000000" />
                    </FormField>
                    <FormField label="Max Call Duration (sec)">
                      <AppInput type="number" min={60} value={config.max_call_duration_seconds} onChange={e => setConfig(c => ({ ...c, max_call_duration_seconds: Number(e.target.value) }))} />
                    </FormField>
                  </div>
                </div>
                <div className="mt-3">
                  <AppBtn size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : '💾 Save Rules'}</AppBtn>
                </div>
              </PageCard>
            </div>
          </div>
        )}

        {tab === 'test' && (
          <PageCard title="🧪 Test Your AI Receptionist" subtitle="Chat with the AI exactly as a caller would — uses your saved greeting, knowledge base, doctors & personality. Save your changes first to test them.">
            <div className="flex flex-col" style={{ height: 'calc(100vh - 260px)' }}>
              <div className="flex-1 overflow-y-auto rounded-xl p-4 space-y-3"
                style={{ background: 'var(--s1)', border: '1px solid var(--b2)' }}>
                {chat.length === 0 && (
                  <div className="text-center mt-12">
                    <div className="text-4xl mb-3 opacity-40">🤖</div>
                    <p className="text-sm" style={{ color: 'var(--txt3)' }}>
                      Type a message like a patient would — e.g. <em>&quot;Mujhe appointment book karni hai&quot;</em>{' '}
                    </p>
                  </div>
                )}
                {chat.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm"
                      style={{
                        background: m.role === 'user' ? 'var(--acc)' : 'var(--s3)',
                        color: m.role === 'user' ? '#fff' : 'var(--txt)',
                        border: m.role === 'user' ? 'none' : '1px solid var(--b2)',
                      }}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatBusy && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-2.5 text-sm" style={{ background: 'var(--s3)', color: 'var(--txt3)', border: '1px solid var(--b2)' }}>
                      typing…
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChat() }}
                  placeholder="Type a patient message and press Enter…"
                  className="flex-1 rounded-lg px-4 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                />
                <AppBtn onClick={sendChat} disabled={chatBusy || !chatInput.trim()}>Send</AppBtn>
                {chat.length > 0 && <AppBtn variant="secondary" onClick={() => setChat([])}>Clear</AppBtn>}
              </div>
            </div>
          </PageCard>
        )}

        {tab === 'logs' && (
          <div className="flex flex-col items-center py-20">
            <div className="text-4xl mb-3 opacity-40">📞</div>
            <p className="text-sm" style={{ color: 'var(--txt3)' }}>Call logs will appear here once AI starts handling calls.</p>
          </div>
        )}
      </div>
    </div>
  )
}
