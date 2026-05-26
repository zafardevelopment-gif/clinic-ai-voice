/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { placeReminderCall } from '@/lib/reminders/place-call'

/**
 * GET /api/cron/reminders
 *
 * The scheduler heartbeat. Designed for Vercel Cron (or any cron-as-a-service).
 *
 * Two jobs:
 *   1. ENQUEUE — scan upcoming appointments and create appointment_reminders
 *      rows that aren't queued yet (24h-out and 2h-out).
 *   2. DISPATCH — place calls for reminders whose scheduled_at has passed,
 *      respecting each clinic's call window.
 *
 * Configure Vercel Cron (vercel.json):
 *   { "crons": [{ "path": "/api/cron/reminders", "schedule": "0,15,30,45 * * * *" }] }
 *
 * Auth: header `x-cron-secret` must match CRON_SECRET, OR
 *       Vercel Cron's auto-injected `authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  // Auth.
  const headerSecret = req.headers.get('x-cron-secret')
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || ''
  const expected = process.env.CRON_SECRET || process.env.WORKER_SECRET
  if (!expected || (headerSecret !== expected && bearer !== expected)) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  const enqueued = await enqueueUpcoming(db)
  const dispatched = await dispatchDue(db)

  return NextResponse.json({
    ok: true,
    enqueued,
    dispatched: dispatched.length,
    results: dispatched,
  })
}

// Allow Vercel Cron to use either GET (default) or POST.
export const POST = GET

// ─── ENQUEUE: create rows for upcoming + recent appointments ───────────────
async function enqueueUpcoming(
  db: any,
): Promise<{ count_24h: number; count_2h: number; count_post_visit: number }> {
  const now = new Date()

  // 24h window: appointments starting between 23.5h and 24.5h from now.
  const lower24 = new Date(now.getTime() + 23.5 * 60 * 60 * 1000)
  const upper24 = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)

  // 2h window: appointments starting between 1.75h and 2.25h from now.
  const lower2 = new Date(now.getTime() + 1.75 * 60 * 60 * 1000)
  const upper2 = new Date(now.getTime() + 2.25 * 60 * 60 * 1000)

  const count24 = await enqueueForWindow(db, 'appointment_24h', lower24, upper24, false)
  const count2 = await enqueueForWindow(db, 'appointment_2h', lower2, upper2, false)
  const countPV = await enqueuePostVisit(db)

  return { count_24h: count24, count_2h: count2, count_post_visit: countPV }
}

async function enqueueForWindow(
  db: any,
  type: 'appointment_24h' | 'appointment_2h',
  lower: Date,
  upper: Date,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isPostVisit: boolean,
): Promise<number> {
  // Pull appointments in the window that don't have a reminder of this type yet.
  // Note: appointment_date is DATE, appointment_time is TIME — combine in JS
  // since combining in Postgres needs a timezone-aware concat. Pull a small
  // batch and filter.
  const { data: candidates } = await db
    .from('appointments')
    .select(`
      id, clinic_id, patient_id, appointment_date, appointment_time, status,
      patients ( phone )
    `)
    .in('status', ['scheduled', 'confirmed'])
    .gte('appointment_date', lower.toISOString().slice(0, 10))
    .lte('appointment_date', upper.toISOString().slice(0, 10))
    .limit(500)

  if (!candidates || candidates.length === 0) return 0

  // Filter out clinics that have this reminder type disabled — saves us
  // creating rows that the dispatcher would just cancel via feature-gate.
  const enabledClinics = await loadEnabledClinics(
    db,
    Array.from(new Set(candidates.map((c: any) => c.clinic_id))),
    type === 'appointment_24h' ? 'appointment_24h_enabled' : 'appointment_2h_enabled',
  )

  let created = 0
  for (const appt of candidates as any[]) {
    if (!enabledClinics.has(appt.clinic_id)) continue

    // Build a timestamp in the clinic's local TZ. Assume IST for now — the
    // proper fix is a clinic.timezone column; until then this is correct for
    // Indian clinics which is the entire target market.
    const startsAt = new Date(`${appt.appointment_date}T${appt.appointment_time}+05:30`)
    if (startsAt < lower || startsAt > upper) continue

    const phone = appt.patients?.phone
    if (!phone) continue

    const scheduledAt =
      type === 'appointment_24h'
        ? new Date(startsAt.getTime() - 24 * 60 * 60 * 1000)
        : new Date(startsAt.getTime() - 2 * 60 * 60 * 1000)

    // Insert; UNIQUE (appointment_id, type) prevents duplicates.
    const { error } = await db.from('appointment_reminders').insert({
      clinic_id: appt.clinic_id,
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      type,
      status: 'scheduled',
      to_number: phone,
      scheduled_at: scheduledAt.toISOString(),
    })

    if (!error) created++
  }

  return created
}

/**
 * Post-visit enqueue: appointments completed ~3 days ago get a follow-up.
 * We only consider rows whose appointment_date is exactly 3 days ago in IST
 * AND whose status is 'completed'. The scheduler runs every 15min so we
 * use a date-only match (one row per appointment, dedupe via UNIQUE).
 */
async function enqueuePostVisit(db: any): Promise<number> {
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  // 3 days ago in IST, as YYYY-MM-DD
  const threeDaysAgo = new Date(istNow.getTime() - 3 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const { data: candidates } = await db
    .from('appointments')
    .select(`
      id, clinic_id, patient_id, appointment_date, appointment_time, status,
      patients ( phone )
    `)
    .eq('status', 'completed')
    .eq('appointment_date', threeDaysAgo)
    .limit(500)

  if (!candidates || candidates.length === 0) return 0

  const enabledClinics = await loadEnabledClinics(
    db,
    Array.from(new Set(candidates.map((c: any) => c.clinic_id))),
    'post_visit_enabled',
  )

  // Schedule each post-visit call for "today at 11am IST" — a friendly time
  // that respects the default call window.
  const scheduledAt = new Date(istNow)
  scheduledAt.setUTCHours(11 - 5.5, 0, 0, 0)  // 11 AM IST
  // If we've already passed 11am IST today, schedule for the next 15min tick.
  if (scheduledAt < new Date()) {
    scheduledAt.setTime(Date.now())
  }

  let created = 0
  for (const appt of candidates as any[]) {
    if (!enabledClinics.has(appt.clinic_id)) continue
    const phone = appt.patients?.phone
    if (!phone) continue

    const { error } = await db.from('appointment_reminders').insert({
      clinic_id: appt.clinic_id,
      appointment_id: appt.id,
      patient_id: appt.patient_id,
      type: 'post_visit',
      status: 'scheduled',
      to_number: phone,
      scheduled_at: scheduledAt.toISOString(),
    })

    if (!error) created++
  }

  return created
}

/**
 * Return the subset of clinic_ids whose reminder_settings has BOTH the
 * master switch AND the per-type column set to true.
 */
async function loadEnabledClinics(
  db: any,
  clinicIds: string[],
  toggleColumn: string,
): Promise<Set<string>> {
  if (clinicIds.length === 0) return new Set()
  const { data } = await db
    .from('reminder_settings')
    .select(`clinic_id, is_enabled, ${toggleColumn}`)
    .in('clinic_id', clinicIds)

  const out = new Set<string>()
  for (const row of (data as any[]) || []) {
    if (row.is_enabled && row[toggleColumn]) out.add(row.clinic_id)
  }
  return out
}

// ─── DISPATCH: place calls for due reminders ────────────────────────────────
async function dispatchDue(db: any): Promise<Array<{ id: string; ok: boolean; reason?: string }>> {
  const now = new Date().toISOString()
  const { data: due } = await db
    .from('appointment_reminders')
    .select('id, clinic_id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', now)
    .limit(50)  // cap per cron tick to avoid timing out on the function runtime

  if (!due || due.length === 0) return []

  // Filter by each clinic's call window (10am-7pm by default).
  const allowedIds = await filterByCallWindow(db, due as Array<{ id: string; clinic_id: string }>)

  const results: Array<{ id: string; ok: boolean; reason?: string }> = []
  for (const id of allowedIds) {
    const r = await placeReminderCall(id)
    results.push({ id: r.reminderId, ok: r.ok, reason: r.reason })
  }
  return results
}

async function filterByCallWindow(
  db: any,
  due: Array<{ id: string; clinic_id: string }>,
): Promise<string[]> {
  const clinicIds = Array.from(new Set(due.map(d => d.clinic_id)))
  const { data: settings } = await db
    .from('reminder_settings')
    .select('clinic_id, is_enabled, call_window_start, call_window_end, call_days')
    .in('clinic_id', clinicIds)

  const settingsMap = new Map<string, any>()
  for (const s of (settings as any[]) || []) settingsMap.set(s.clinic_id, s)

  // Use IST for the window check (target market = India).
  const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const istMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes()
  const istDay = istNow.getUTCDay()

  return due
    .filter(d => {
      const s = settingsMap.get(d.clinic_id)
      if (!s) return true  // no settings row = use defaults (always on)
      if (!s.is_enabled) return false
      if (Array.isArray(s.call_days) && !s.call_days.includes(istDay)) return false
      const [sh, sm] = (s.call_window_start || '10:00').split(':').map((n: string) => parseInt(n, 10))
      const [eh, em] = (s.call_window_end || '19:00').split(':').map((n: string) => parseInt(n, 10))
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      return istMinutes >= startMin && istMinutes <= endMin
    })
    .map(d => d.id)
}
