'use client'

import { useEffect, useState } from 'react'
import StatCard from '@/components/ui/StatCard'

interface Overview {
  activeFollowUps: number
  openAdherenceAlerts: number
  adherenceRate: number
  totalTriageSessions: number
  triageCounts: { emergency: number; urgent_same_day: number; routine: number; follow_up: number }
  labExplanationsGenerated: number
}

export default function ClinicOsWidgets() {
  const [data, setData] = useState<Overview | null>(null)

  useEffect(() => {
    fetch('/api/clinic/analytics/overview').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data) return null

  return (
    <div className="mb-5">
      <div className="text-[11px] uppercase tracking-[1.2px] mb-2" style={{ color: 'var(--txt3)' }}>Clinic OS</div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <StatCard icon="💊" label="Active Follow-ups" value={data.activeFollowUps} color="blue" />
        <StatCard icon="⚠️" label="Adherence Alerts" value={data.openAdherenceAlerts} color="rose" />
        <StatCard icon="✅" label="Adherence Rate" value={`${data.adherenceRate}%`} color="teal" />
        <StatCard icon="🩺" label="Triage Sessions" value={data.totalTriageSessions} color="violet" />
        <StatCard icon="🧪" label="Lab Explanations" value={data.labExplanationsGenerated} color="amber" />
      </div>
    </div>
  )
}
