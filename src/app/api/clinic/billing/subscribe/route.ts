/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSession } from '@/lib/session'
import {
  createRazorpayCustomer,
  createRazorpaySubscription,
} from '@/lib/billing/razorpay'

/**
 * POST /api/clinic/billing/subscribe
 *
 * Body: { plan_code: 'basic'|'pro'|'premium', cycle: 'monthly'|'yearly' }
 *
 * Flow (when Razorpay is wired):
 *   1. Look up clinic + current subscription
 *   2. If razorpay_customer_id missing → create Razorpay customer
 *   3. Look up razorpay_plan_id for the target plan
 *   4. Create Razorpay subscription
 *   5. Persist razorpay_subscription_id + plan + status='active'
 *   6. Return checkout URL or subscription object
 *
 * Until Razorpay is wired, this returns 503 — the Super Admin can still
 * change a clinic's plan manually via /admin/clinics/[id]/subscription.
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!['basic', 'pro', 'premium'].includes(body.plan_code)) {
    return NextResponse.json({ error: 'invalid_plan_code' }, { status: 400 })
  }
  if (!['monthly', 'yearly'].includes(body.cycle)) {
    return NextResponse.json({ error: 'invalid_cycle' }, { status: 400 })
  }

  // Razorpay not wired yet — return a clear message instead of pretending.
  if (!process.env.RAZORPAY_KEY_ID) {
    return NextResponse.json(
      {
        error: 'razorpay_not_configured',
        message:
          'Self-serve billing is not available yet. Please contact support — ' +
          'a super admin can change your plan manually from the admin dashboard.',
      },
      { status: 503 },
    )
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  const [{ data: clinic }, { data: sub }] = await Promise.all([
    db.from('clinics').select('id, name, email, phone').eq('id', session.clinicId).single(),
    db.from('clinic_subscriptions').select('*').eq('clinic_id', session.clinicId).single(),
  ])

  if (!clinic) return NextResponse.json({ error: 'clinic_not_found' }, { status: 404 })
  if (!sub) return NextResponse.json({ error: 'subscription_not_found' }, { status: 404 })

  try {
    let customerId = sub.razorpay_customer_id
    if (!customerId) {
      customerId = await createRazorpayCustomer({
        clinicId: clinic.id,
        name: clinic.name,
        email: clinic.email || '',
        phone: clinic.phone || undefined,
      })
      await db
        .from('clinic_subscriptions')
        .update({ razorpay_customer_id: customerId })
        .eq('clinic_id', session.clinicId)
    }

    // TODO: pull razorpay_plan_id from subscription_plans table (you'll
    // add this column once you've created the plans in Razorpay dashboard).
    const razorpayPlanId = ''  // <-- map from body.plan_code

    const subscriptionId = await createRazorpaySubscription({
      clinicId: clinic.id,
      razorpayCustomerId: customerId,
      razorpayPlanId,
      cycle: body.cycle,
    })

    return NextResponse.json({ ok: true, subscription_id: subscriptionId })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'razorpay_error', message: err?.message || String(err) },
      { status: 500 },
    )
  }
}
