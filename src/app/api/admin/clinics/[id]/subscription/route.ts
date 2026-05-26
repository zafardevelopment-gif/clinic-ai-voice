/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSession } from '@/lib/session'

/**
 * /api/admin/clinics/[id]/subscription
 *
 * GET   → returns the clinic's subscription + computed effective features
 *         (plan defaults merged with overrides) + recent audit log entries.
 *
 * PATCH → mutate subscription. Body:
 *   {
 *     plan?: 'trial'|'basic'|'pro'|'premium',
 *     status?: 'trialing'|'active'|'paused'|'cancelled',
 *     monthly_call_limit?: number | null,
 *     feature_overrides?: { [featureKey]: boolean | null },  // null = remove override
 *     reason?: string,
 *   }
 *   Each change is audited into subscription_audit_log.
 */

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any
}

async function requireAdmin() {
  const s = await getSession()
  if (!s || s.role !== 'admin') return null
  return s
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const db = admin()
  const [{ data: sub }, { data: clinic }, { data: audit }] = await Promise.all([
    db.from('clinic_subscriptions').select('*').eq('clinic_id', params.id).single(),
    db.from('clinics').select('id, name, phone, is_active').eq('id', params.id).single(),
    db.from('subscription_audit_log')
      .select('id, action, old_value, new_value, reason, changed_by, created_at')
      .eq('clinic_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!sub) {
    return NextResponse.json({ error: 'subscription_not_found' }, { status: 404 })
  }

  // Pull the plan defaults so the UI can show effective state.
  const { data: plan } = await db
    .from('subscription_plans')
    .select('plan_code, display_name, features, monthly_price_inr, monthly_call_limit')
    .eq('plan_code', sub.plan)
    .single()

  const overrides = (sub.feature_overrides || {}) as Record<string, boolean>
  const planFeatures = (plan?.features || {}) as Record<string, boolean>
  const effective: Record<string, boolean> = { ...planFeatures, ...overrides }

  return NextResponse.json({
    clinic,
    subscription: sub,
    plan,
    effective_features: effective,
    audit_log: audit || [],
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const db = admin()
  const { data: current } = await db
    .from('clinic_subscriptions')
    .select('*')
    .eq('clinic_id', params.id)
    .single()

  if (!current) return NextResponse.json({ error: 'subscription_not_found' }, { status: 404 })

  const updates: Record<string, unknown> = {}
  const auditEntries: Array<{ action: string; old_value: any; new_value: any }> = []

  if (typeof body.plan === 'string' && body.plan !== current.plan) {
    updates.plan = body.plan
    auditEntries.push({ action: 'plan_changed', old_value: current.plan, new_value: body.plan })
  }

  if (typeof body.status === 'string' && body.status !== current.status) {
    updates.status = body.status
    auditEntries.push({ action: 'status_changed', old_value: current.status, new_value: body.status })
  }

  if ('monthly_call_limit' in body && body.monthly_call_limit !== current.monthly_call_limit) {
    updates.monthly_call_limit = body.monthly_call_limit  // null OK = unlimited
    auditEntries.push({
      action: 'limit_changed',
      old_value: current.monthly_call_limit,
      new_value: body.monthly_call_limit,
    })
  }

  if (body.feature_overrides && typeof body.feature_overrides === 'object') {
    const merged: Record<string, boolean> = { ...(current.feature_overrides || {}) }
    for (const [key, value] of Object.entries(body.feature_overrides)) {
      if (value === null) {
        // null means "remove override, fall back to plan default"
        delete merged[key]
        auditEntries.push({
          action: 'override_removed',
          old_value: { [key]: current.feature_overrides?.[key] },
          new_value: null,
        })
      } else if (typeof value === 'boolean') {
        if (current.feature_overrides?.[key] !== value) {
          auditEntries.push({
            action: value ? 'feature_granted' : 'feature_revoked',
            old_value: { [key]: current.feature_overrides?.[key] ?? null },
            new_value: { [key]: value },
          })
        }
        merged[key] = value
      }
    }
    updates.feature_overrides = merged
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, noop: true })
  }

  const { data: updated, error } = await db
    .from('clinic_subscriptions')
    .update(updates)
    .eq('clinic_id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Write audit entries (best-effort — don't fail the request if logging fails).
  if (auditEntries.length > 0) {
    const rows = auditEntries.map(e => ({
      clinic_id: params.id,
      changed_by: session.userId,
      action: e.action,
      old_value: e.old_value,
      new_value: e.new_value,
      reason: body.reason || null,
    }))
    await db.from('subscription_audit_log').insert(rows)
  }

  return NextResponse.json({ ok: true, subscription: updated })
}
