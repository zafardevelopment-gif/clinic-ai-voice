import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET /api/clinic/appointments/[id]/timeline
 *
 * All reminder attempts + their events for a single appointment, newest
 * first — powers the "Appointment Communication Timeline" view.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!session.clinicId) return NextResponse.json({ error: 'No clinic' }, { status: 403 })

  const db = getDb()

  const { data: reminders, error } = await db
    .from('appointment_reminders')
    .select('id, type, channel, status, response, scheduled_at, placed_at, ended_at, spoken_script, error_message')
    .eq('appointment_id', params.id)
    .eq('clinic_id', session.clinicId)
    .order('scheduled_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!reminders || reminders.length === 0) return NextResponse.json({ reminders: [] })

  const { data: events } = await db
    .from('reminder_events')
    .select('id, reminder_id, event_type, payload, created_at')
    .in('reminder_id', reminders.map(r => r.id))
    .order('created_at', { ascending: true })

  const eventsByReminder = new Map<string, typeof events>()
  for (const e of events || []) {
    const list = eventsByReminder.get(e.reminder_id) || []
    list.push(e)
    eventsByReminder.set(e.reminder_id, list)
  }

  return NextResponse.json({
    reminders: reminders.map(r => ({ ...r, events: eventsByReminder.get(r.id) || [] })),
  })
}
