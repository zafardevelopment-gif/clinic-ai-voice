import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET /api/clinic/adherence/dashboard
 *
 * Follow-up dashboard data: pending follow-ups, adherence-risk patients
 * (open alerts), and callback requests.
 */
export async function GET() {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const todayIso = new Date().toISOString().slice(0, 10)

  const [pendingRes, alertsRes] = await Promise.all([
    db
      .from('follow_up_plans')
      .select('id, patient_id, follow_up_date, reminder_frequency, status, patients ( full_name, phone )')
      .eq('clinic_id', session.clinicId)
      .eq('status', 'active')
      .gte('follow_up_date', todayIso)
      .order('follow_up_date', { ascending: true })
      .limit(100),
    db
      .from('adherence_alerts')
      .select('id, follow_up_plan_id, patient_id, alert_type, status, created_at, patients ( full_name, phone )')
      .eq('clinic_id', session.clinicId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const alerts = alertsRes.data || []

  return NextResponse.json({
    pendingFollowUps: pendingRes.data || [],
    atRiskPatients: alerts.filter(a => a.alert_type === 'repeated_missed' || a.alert_type === 'side_effects'),
    callbackRequests: alerts.filter(a => a.alert_type === 'callback_requested'),
    allOpenAlerts: alerts,
  })
}
