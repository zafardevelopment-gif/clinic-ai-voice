/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Feature gating for ClinicPing subscriptions.
 *
 * Resolution priority (matches the clinic_has_feature SQL function in
 * migration 0003):
 *   1. clinic_subscriptions.feature_overrides[key]     ← Super Admin override
 *   2. subscription_plans.features[key]                ← plan default
 *   3. reminder_settings.{key}_enabled (if applicable) ← clinic admin toggle
 *
 * We keep the logic in TS as well as SQL so:
 *   - Route handlers don't have to round-trip to the DB function (cheaper).
 *   - We can return *why* a feature is blocked (for clear UI errors).
 */

export type FeatureKey =
  | 'appointment_24h'
  | 'appointment_2h'
  | 'post_visit'
  | 'birthday'
  | 'annual_checkup'
  | 'broadcast'
  | 'custom_voice'
  | 'pdf_report'

const TOGGLE_COLUMN: Partial<Record<FeatureKey, string>> = {
  appointment_24h: 'appointment_24h_enabled',
  appointment_2h: 'appointment_2h_enabled',
  post_visit: 'post_visit_enabled',
  birthday: 'birthday_enabled',
  annual_checkup: 'annual_checkup_enabled',
  broadcast: 'broadcast_enabled',
}

export interface FeatureStatus {
  enabled: boolean
  /** Plan code at time of check, for diagnostics. */
  plan: string
  /** Why it's blocked, if not enabled. Null when enabled. */
  blockedReason: 'plan' | 'clinic_disabled' | 'subscription_inactive' | 'quota_exceeded' | null
  /** Remaining calls in current cycle. NULL = unlimited. */
  remainingCalls: number | null
}

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any
}

/**
 * Check whether `clinicId` can use `feature` right now.
 * Also enforces subscription status (trialing/active vs paused/cancelled)
 * and the per-cycle call quota for features that consume calls.
 */
export async function checkFeature(
  clinicId: string,
  feature: FeatureKey,
  options: { consumesCall?: boolean } = { consumesCall: true },
): Promise<FeatureStatus> {
  const db = admin()

  const [subRes, settingsRes] = await Promise.all([
    db
      .from('clinic_subscriptions')
      .select('plan, status, monthly_call_limit, calls_used_this_cycle, feature_overrides')
      .eq('clinic_id', clinicId)
      .single(),
    db
      .from('reminder_settings')
      .select('is_enabled, appointment_24h_enabled, appointment_2h_enabled, post_visit_enabled, birthday_enabled, annual_checkup_enabled, broadcast_enabled')
      .eq('clinic_id', clinicId)
      .maybeSingle(),
  ])

  const sub = subRes.data
  if (!sub) {
    return {
      enabled: false,
      plan: 'none',
      blockedReason: 'subscription_inactive',
      remainingCalls: 0,
    }
  }

  // Subscription must be live.
  if (!['trialing', 'active'].includes(sub.status)) {
    return {
      enabled: false,
      plan: sub.plan,
      blockedReason: 'subscription_inactive',
      remainingCalls: 0,
    }
  }

  // Lookup plan feature defaults.
  const { data: plan } = await db
    .from('subscription_plans')
    .select('features')
    .eq('plan_code', sub.plan)
    .single()

  const planFeatures = (plan?.features || {}) as Record<string, boolean>
  const overrides = (sub.feature_overrides || {}) as Record<string, boolean>

  // Override wins over plan default.
  const planAllows = feature in overrides ? !!overrides[feature] : !!planFeatures[feature]
  if (!planAllows) {
    return {
      enabled: false,
      plan: sub.plan,
      blockedReason: 'plan',
      remainingCalls: remaining(sub),
    }
  }

  // Clinic admin toggle (only for features that have a column).
  const col = TOGGLE_COLUMN[feature]
  if (col && settingsRes.data) {
    const masterOff = settingsRes.data.is_enabled === false
    // `as any` because the column name is dynamic.
    const featureOff = (settingsRes.data as any)[col] === false
    if (masterOff || featureOff) {
      return {
        enabled: false,
        plan: sub.plan,
        blockedReason: 'clinic_disabled',
        remainingCalls: remaining(sub),
      }
    }
  }

  // Quota check (only for features that actually place calls).
  if (options.consumesCall && sub.monthly_call_limit !== null) {
    const used = sub.calls_used_this_cycle ?? 0
    if (used >= sub.monthly_call_limit) {
      return {
        enabled: false,
        plan: sub.plan,
        blockedReason: 'quota_exceeded',
        remainingCalls: 0,
      }
    }
  }

  return {
    enabled: true,
    plan: sub.plan,
    blockedReason: null,
    remainingCalls: remaining(sub),
  }
}

function remaining(sub: { monthly_call_limit: number | null; calls_used_this_cycle: number | null }): number | null {
  if (sub.monthly_call_limit === null) return null
  return Math.max(0, sub.monthly_call_limit - (sub.calls_used_this_cycle ?? 0))
}

/**
 * Atomically increment calls_used_this_cycle. Call this AFTER a call is
 * placed (in the outbound-reminder route).
 *
 * Uses an RPC-less optimistic update — if the cycle resets mid-call, the
 * worst case is one over-counted call, which is acceptable.
 */
export async function recordCallUsage(clinicId: string, count = 1): Promise<void> {
  const db = admin()
  const { data: sub } = await db
    .from('clinic_subscriptions')
    .select('calls_used_this_cycle')
    .eq('clinic_id', clinicId)
    .single()
  if (!sub) return
  await db
    .from('clinic_subscriptions')
    .update({ calls_used_this_cycle: (sub.calls_used_this_cycle ?? 0) + count })
    .eq('clinic_id', clinicId)
}
