import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET /api/clinic/analytics/reminders
 *
 * No-show reducer dashboard metrics: total reminders sent, confirmation
 * rate, no-show rate, reschedule rate — computed from appointment_reminders
 * + appointments over the last N days (default 30, ?days= override).
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.clinicId && session.role !== 'admin') {
    return NextResponse.json({ error: 'no_clinic_in_session' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') || '30', 10) || 30, 365)
  const clinicId = session.role === 'admin' ? (searchParams.get('clinic_id') || session.clinicId) : session.clinicId
  if (!clinicId) return NextResponse.json({ error: 'clinic_id required' }, { status: 400 })

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const db = getDb()

  const { data: reminders } = await db
    .from('appointment_reminders')
    .select('id, type, channel, status, response, created_at')
    .eq('clinic_id', clinicId)
    .gte('created_at', since)

  const rows = reminders || []
  const totalSent = rows.filter(r => r.status !== 'scheduled' && r.status !== 'cancelled').length
  const confirmed = rows.filter(r => r.response === 'confirmed').length
  const rescheduled = rows.filter(r => r.response === 'reschedule').length
  const cancelled = rows.filter(r => r.response === 'cancel').length

  const { data: appts } = await db
    .from('appointments')
    .select('id, status')
    .eq('clinic_id', clinicId)
    .gte('appointment_date', since.slice(0, 10))

  const apptRows = appts || []
  const totalAppts = apptRows.length
  const noShows = apptRows.filter(a => a.status === 'no_show').length

  const byChannel: Record<string, number> = {}
  for (const r of rows) byChannel[r.channel] = (byChannel[r.channel] || 0) + 1

  return NextResponse.json({
    windowDays: days,
    totalSent,
    confirmationRate: totalSent > 0 ? Math.round((confirmed / totalSent) * 1000) / 10 : 0,
    noShowRate: totalAppts > 0 ? Math.round((noShows / totalAppts) * 1000) / 10 : 0,
    rescheduleRate: totalSent > 0 ? Math.round((rescheduled / totalSent) * 1000) / 10 : 0,
    cancelledViaReminder: cancelled,
    totalAppointments: totalAppts,
    totalNoShows: noShows,
    byChannel,
  })
}
