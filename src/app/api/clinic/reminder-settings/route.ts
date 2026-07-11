/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSession } from '@/lib/session'

/**
 * /api/clinic/reminder-settings
 *
 * GET   → returns the clinic's reminder_settings row + a snapshot of which
 *         features they're *entitled* to (so the UI can grey out the ones
 *         their plan doesn't include).
 *
 * PATCH → updates reminder_settings. Body is a partial of the row; only
 *         clinic-controllable fields are accepted.
 *
 * Auth: any logged-in user whose session.clinicId matches.
 */

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any
}

const EDITABLE_FIELDS = [
  'is_enabled',
  'appointment_24h_enabled',
  'appointment_2h_enabled',
  'post_visit_enabled',
  'birthday_enabled',
  'annual_checkup_enabled',
  'broadcast_enabled',
  'call_window_start',
  'call_window_end',
  'call_days',
  'language',
  'voice_id',
  'template_appointment_24h',
  'template_appointment_2h',
  'template_post_visit',
  'template_birthday',
  'max_retries',
  'retry_gap_minutes',
  'channel_appointment_24h',
  'channel_appointment_2h',
  'channel_post_visit',
  'channel_birthday',
]

async function resolveClinicId(): Promise<{ clinicId: string; isAdmin: boolean } | null> {
  const session = await getSession()
  if (!session) return null
  if (session.role === 'admin') {
    // Admins can pass a ?clinic_id= override; not strictly needed here since
    // each clinic has its own settings row addressed by session.clinicId.
    return { clinicId: session.clinicId || '', isAdmin: true }
  }
  if (!session.clinicId) return null
  return { clinicId: session.clinicId, isAdmin: false }
}

export async function GET(req: NextRequest) {
  const ctx = await resolveClinicId()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const clinicId = ctx.isAdmin ? (url.searchParams.get('clinic_id') || ctx.clinicId) : ctx.clinicId
  if (!clinicId) return NextResponse.json({ error: 'no_clinic_in_session' }, { status: 400 })

  const db = admin()

  const [settingsRes, subRes] = await Promise.all([
    db.from('reminder_settings').select('*').eq('clinic_id', clinicId).maybeSingle(),
    db.from('clinic_subscriptions')
      .select('plan, feature_overrides, monthly_call_limit, calls_used_this_cycle, status')
      .eq('clinic_id', clinicId)
      .single(),
  ])

  let settings = settingsRes.data
  // Auto-create a default settings row if missing (shouldn't happen after the
  // migration's seed, but defensive for clinics created post-seed).
  if (!settings) {
    const { data: created } = await db
      .from('reminder_settings')
      .insert({ clinic_id: clinicId })
      .select('*')
      .single()
    settings = created
  }

  // Compute entitled features = plan defaults merged with overrides.
  let entitled: Record<string, boolean> = {}
  if (subRes.data) {
    const { data: plan } = await db
      .from('subscription_plans')
      .select('features')
      .eq('plan_code', subRes.data.plan)
      .single()
    entitled = { ...(plan?.features || {}), ...(subRes.data.feature_overrides || {}) } as Record<string, boolean>
  }

  return NextResponse.json({
    settings,
    subscription: subRes.data,
    entitled_features: entitled,
  })
}

export async function PATCH(req: NextRequest) {
  const ctx = await resolveClinicId()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const url = new URL(req.url)
  const clinicId = ctx.isAdmin ? (url.searchParams.get('clinic_id') || ctx.clinicId) : ctx.clinicId
  if (!clinicId) return NextResponse.json({ error: 'no_clinic_in_session' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) patch[key] = body[key]
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_updatable_fields' }, { status: 400 })
  }

  const db = admin()
  const { data, error } = await db
    .from('reminder_settings')
    .update(patch)
    .eq('clinic_id', clinicId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, settings: data })
}
