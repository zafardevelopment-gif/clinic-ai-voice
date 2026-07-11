import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET /api/clinic/analytics/overview
 *
 * Cross-module counts for the Clinic OS dashboard widgets: no-show
 * reduction, follow-up adherence, triage category counts, lab explanation
 * usage. Reminder delivery/response funnel is covered in detail by
 * /api/clinic/analytics/reminders — this endpoint gives the summary numbers.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const days = Math.min(parseInt(req.nextUrl.searchParams.get('days') || '30', 10) || 30, 365)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const db = getDb()
  const clinicId = session.clinicId

  const [
    { count: activeFollowUps },
    { count: openAlerts },
    { data: adherenceLogs },
    { data: triageResults },
    { count: labExplanationsCount },
  ] = await Promise.all([
    db.from('follow_up_plans').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'active'),
    db.from('adherence_alerts').select('*', { count: 'exact', head: true }).eq('clinic_id', clinicId).eq('status', 'open'),
    db.from('adherence_logs').select('response, follow_up_plans!inner(clinic_id)').eq('follow_up_plans.clinic_id', clinicId).gte('logged_at', since),
    db.from('triage_results').select('category, symptom_triage_sessions!inner(clinic_id)').eq('symptom_triage_sessions.clinic_id', clinicId).gte('created_at', since),
    db.from('lab_explanations').select('lab_reports!inner(clinic_id)', { count: 'exact', head: true }).eq('lab_reports.clinic_id', clinicId).gte('created_at', since),
  ])

  const logs = adherenceLogs || []
  const takenCount = logs.filter(l => l.response === 'taken').length
  const adherenceRate = logs.length > 0 ? Math.round((takenCount / logs.length) * 1000) / 10 : 0

  const triageCounts: Record<string, number> = { emergency: 0, urgent_same_day: 0, routine: 0, follow_up: 0 }
  for (const r of triageResults || []) {
    if (r.category in triageCounts) triageCounts[r.category]++
  }

  return NextResponse.json({
    windowDays: days,
    activeFollowUps: activeFollowUps ?? 0,
    openAdherenceAlerts: openAlerts ?? 0,
    adherenceRate,
    triageCounts,
    totalTriageSessions: Object.values(triageCounts).reduce((a, b) => a + b, 0),
    labExplanationsGenerated: labExplanationsCount ?? 0,
  })
}
