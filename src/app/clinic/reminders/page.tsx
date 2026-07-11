'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import StatCard from '@/components/ui/StatCard'
import { FormField, AppInput, AppSelect } from '@/components/ui/FormField'

interface Settings {
  is_enabled: boolean
  appointment_24h_enabled: boolean
  appointment_2h_enabled: boolean
  post_visit_enabled: boolean
  birthday_enabled: boolean
  annual_checkup_enabled: boolean
  broadcast_enabled: boolean
  call_window_start: string
  call_window_end: string
  call_days: number[]
  language: string
  voice_id: string | null
  template_appointment_24h: string | null
  template_appointment_2h: string | null
  template_post_visit: string | null
  template_birthday: string | null
  max_retries: number
  retry_gap_minutes: number
  channel_appointment_24h: 'voice' | 'whatsapp' | 'sms'
  channel_appointment_2h: 'voice' | 'whatsapp' | 'sms'
  channel_post_visit: 'voice' | 'whatsapp' | 'sms'
  channel_birthday: 'voice' | 'whatsapp' | 'sms'
}

interface Analytics {
  totalSent: number
  confirmationRate: number
  noShowRate: number
  rescheduleRate: number
}

const CHANNEL_KEY: Partial<Record<keyof Settings, keyof Settings>> = {
  appointment_24h_enabled: 'channel_appointment_24h',
  appointment_2h_enabled: 'channel_appointment_2h',
  post_visit_enabled: 'channel_post_visit',
  birthday_enabled: 'channel_birthday',
}

interface Subscription {
  plan: string
  status: string
  monthly_call_limit: number | null
  calls_used_this_cycle: number
}

const REMINDER_TYPES: { key: keyof Settings; featureKey: string; label: string; desc: string }[] = [
  { key: 'appointment_24h_enabled', featureKey: 'appointment_24h', label: '24h Appointment Reminder', desc: 'Call 1 day before appointment' },
  { key: 'appointment_2h_enabled',  featureKey: 'appointment_2h',  label: '2h Appointment Reminder',  desc: 'Call 2 hours before appointment' },
  { key: 'post_visit_enabled',      featureKey: 'post_visit',      label: 'Post-Visit Follow-up',     desc: 'Call 3 days after the visit' },
  { key: 'birthday_enabled',        featureKey: 'birthday',        label: 'Birthday Wish',            desc: 'Call patient on their birthday' },
  { key: 'annual_checkup_enabled',  featureKey: 'annual_checkup',  label: 'Annual Checkup Reminder',  desc: '1 year since last visit' },
  { key: 'broadcast_enabled',       featureKey: 'broadcast',       label: 'Broadcast',                desc: 'Mass call to all patients' },
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ClinicRemindersPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [sub, setSub] = useState<Subscription | null>(null)
  const [entitled, setEntitled] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/clinic/reminder-settings')
    const j = await res.json()
    setSettings(j.settings)
    setSub(j.subscription)
    setEntitled(j.entitled_features || {})
    setLoading(false)
    setDirty(false)
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    fetch('/api/clinic/analytics/reminders').then(r => r.json()).then(setAnalytics).catch(() => {})
  }, [])

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(s => s ? { ...s, [key]: value } : s)
    setDirty(true)
  }

  function toggleDay(day: number) {
    if (!settings) return
    const has = settings.call_days.includes(day)
    const next = has ? settings.call_days.filter(d => d !== day) : [...settings.call_days, day].sort()
    set('call_days', next)
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    const res = await fetch('/api/clinic/reminder-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) load()
    else {
      const j = await res.json().catch(() => ({}))
      alert(`Failed: ${j.error || res.statusText}`)
    }
  }

  if (loading || !settings) {
    return (
      <>
        <Topbar title="Reminders" />
        <PageCard><div className="text-sm" style={{ color: 'var(--txt2)' }}>Loading…</div></PageCard>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="Reminder Settings"
        subtitle="Control which automatic call reminders go out to your patients"
        actions={
          <AppBtn onClick={save} disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </AppBtn>
        }
      />

      {/* Plan banner */}
      {sub && (
        <PageCard className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Current plan</div>
              <div className="font-syne text-lg font-bold capitalize" style={{ color: 'var(--txt)' }}>{sub.plan}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Calls used this cycle</div>
              <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>
                {sub.calls_used_this_cycle}
                {sub.monthly_call_limit !== null && (
                  <span style={{ color: 'var(--txt3)' }}> / {sub.monthly_call_limit}</span>
                )}
                {sub.monthly_call_limit === null && (
                  <span style={{ color: 'var(--txt3)' }}> / unlimited</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--txt3)' }}>Status</div>
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: sub.status === 'active' || sub.status === 'trialing' ? 'var(--teal-dim)' : 'var(--rose-dim)',
                  color: sub.status === 'active' || sub.status === 'trialing' ? 'var(--teal)' : 'var(--rose)',
                }}
              >
                {sub.status}
              </span>
            </div>
          </div>
        </PageCard>
      )}

      {/* Master switch */}
      <PageCard title="Master Switch">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.is_enabled}
            onChange={e => set('is_enabled', e.target.checked)}
          />
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--txt)' }}>
              Reminder calls are {settings.is_enabled ? 'ON' : 'OFF'}
            </div>
            <div className="text-[12px]" style={{ color: 'var(--txt3)' }}>
              Turn off to stop ALL outbound reminder calls without changing per-type settings.
            </div>
          </div>
        </label>
      </PageCard>

      {/* No-show / confirmation analytics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <StatCard icon="📤" label="Reminders sent" value={analytics.totalSent} color="blue" />
          <StatCard icon="✅" label="Confirmation rate" value={`${analytics.confirmationRate}%`} color="teal" />
          <StatCard icon="⚠️" label="No-show rate" value={`${analytics.noShowRate}%`} color="rose" />
          <StatCard icon="🔁" label="Reschedule rate" value={`${analytics.rescheduleRate}%`} color="amber" />
        </div>
      )}

      {/* Per-type toggles */}
      <PageCard
        title="Reminder Types"
        subtitle="Greyed-out types aren't included in your current plan. Contact us to upgrade."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REMINDER_TYPES.map(t => {
            const allowed = !!entitled[t.featureKey]
            const enabled = !!settings[t.key]
            const channelKey = CHANNEL_KEY[t.key]
            return (
              <div
                key={t.key as string}
                className="flex flex-col gap-2 p-3 rounded-lg"
                style={{
                  background: allowed && enabled ? 'var(--acc-dim)' : 'var(--s3)',
                  border: '1px solid var(--b1)',
                  opacity: allowed ? 1 : 0.5,
                }}
              >
                <label className={`flex items-start gap-3 ${allowed ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                  <input
                    type="checkbox"
                    disabled={!allowed}
                    checked={enabled}
                    onChange={e => set(t.key, e.target.checked as never)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--txt)' }}>
                      {t.label}
                      {!allowed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--amber-dim)', color: 'var(--amber)' }}>
                          UPGRADE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px]" style={{ color: 'var(--txt3)' }}>{t.desc}</div>
                  </div>
                </label>
                {channelKey && enabled && allowed && (
                  <div className="pl-7">
                    <select
                      value={settings[channelKey] as string}
                      onChange={e => set(channelKey, e.target.value as never)}
                      className="text-xs rounded-md px-2 py-1"
                      style={{ background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--txt)' }}
                    >
                      <option value="voice">📞 Voice call</option>
                      <option value="whatsapp">💬 WhatsApp</option>
                      <option value="sms">✉️ SMS</option>
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </PageCard>

      {/* Call window */}
      <PageCard title="Call Window" subtitle="Only place reminders during these hours / days (IST)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <FormField label="From">
            <AppInput
              type="time"
              value={settings.call_window_start.slice(0, 5)}
              onChange={e => set('call_window_start', `${e.target.value}:00`)}
            />
          </FormField>
          <FormField label="To">
            <AppInput
              type="time"
              value={settings.call_window_end.slice(0, 5)}
              onChange={e => set('call_window_end', `${e.target.value}:00`)}
            />
          </FormField>
          <FormField label="Language">
            <AppSelect
              value={settings.language}
              onChange={e => set('language', e.target.value)}
            >
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="en-IN">English (India)</option>
              <option value="hi-EN">Hinglish</option>
            </AppSelect>
          </FormField>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.6px] mb-2" style={{ color: 'var(--txt2)' }}>
            Days we may call
          </div>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAYS.map((label, i) => {
              const on = settings.call_days.includes(i)
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: on ? 'var(--acc)' : 'var(--s3)',
                    color: on ? '#fff' : 'var(--txt2)',
                    border: '1px solid var(--b2)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </PageCard>

      {/* Templates */}
      <PageCard
        title="Custom Templates (optional)"
        subtitle="Leave blank to use the AI-generated default. Placeholders: {patient_name}, {doctor_name}, {date}, {time}, {clinic_name}"
      >
        <div className="space-y-3">
          {[
            ['template_appointment_24h', '24h Reminder template'],
            ['template_appointment_2h',  '2h Reminder template'],
            ['template_post_visit',      'Post-visit template'],
            ['template_birthday',        'Birthday template'],
          ].map(([key, label]) => (
            <FormField key={key} label={label}>
              <textarea
                rows={2}
                value={(settings as any)[key] || ''}
                onChange={e => set(key as keyof Settings, e.target.value as never)}
                placeholder="e.g. Namaste {patient_name}, kal {time} pe {doctor_name} ke saath {clinic_name} mein aapka appointment hai."
                style={{
                  width: '100%',
                  background: 'var(--s1)',
                  border: '1px solid var(--b2)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: 'var(--txt)',
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </FormField>
          ))}
        </div>
      </PageCard>

      {/* Retry policy */}
      <PageCard title="Retry Policy" subtitle="What to do when a call isn't answered">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Max retries" hint="0-5">
            <AppInput
              type="number"
              min={0}
              max={5}
              value={settings.max_retries}
              onChange={e => set('max_retries', parseInt(e.target.value) || 0)}
            />
          </FormField>
          <FormField label="Gap between retries (minutes)" hint="≥ 5">
            <AppInput
              type="number"
              min={5}
              value={settings.retry_gap_minutes}
              onChange={e => set('retry_gap_minutes', parseInt(e.target.value) || 30)}
            />
          </FormField>
        </div>
      </PageCard>

      <div className="flex items-center justify-end gap-2 mb-6">
        <AppBtn variant="ghost" onClick={load} disabled={saving}>Discard</AppBtn>
        <AppBtn onClick={save} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </AppBtn>
      </div>
    </>
  )
}
