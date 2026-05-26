/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { verifyRazorpayWebhookSignature } from '@/lib/billing/razorpay'

/**
 * POST /api/webhooks/razorpay
 *
 * Receives Razorpay subscription lifecycle events. Signature is verified
 * against RAZORPAY_WEBHOOK_SECRET.
 *
 * Events we care about:
 *   - subscription.activated  → status = 'active', set period dates
 *   - subscription.charged    → reset calls_used_this_cycle, advance period
 *   - subscription.cancelled  → status = 'cancelled'
 *   - subscription.paused     → status = 'paused'
 *
 * Set this URL in Razorpay dashboard → Settings → Webhooks once your
 * account is live.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') || ''

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const eventType = event.event as string
  const subscriptionId = event.payload?.subscription?.entity?.id as string | undefined

  if (!subscriptionId) {
    // Ignore events that aren't subscription-bound (payments, refunds, etc.)
    return NextResponse.json({ ok: true, ignored: eventType })
  }

  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any

  const updates: Record<string, unknown> = {}
  switch (eventType) {
    case 'subscription.activated':
    case 'subscription.charged': {
      const sub = event.payload.subscription.entity
      updates.status = 'active'
      if (sub.current_start) {
        updates.current_period_start = new Date(sub.current_start * 1000).toISOString()
      }
      if (sub.current_end) {
        updates.current_period_end = new Date(sub.current_end * 1000).toISOString()
      }
      // Reset usage at the start of a new billing cycle.
      if (eventType === 'subscription.charged') {
        updates.calls_used_this_cycle = 0
      }
      break
    }
    case 'subscription.cancelled':
      updates.status = 'cancelled'
      break
    case 'subscription.paused':
      updates.status = 'paused'
      break
    case 'subscription.resumed':
      updates.status = 'active'
      break
    default:
      return NextResponse.json({ ok: true, ignored: eventType })
  }

  const { error } = await db
    .from('clinic_subscriptions')
    .update(updates)
    .eq('razorpay_subscription_id', subscriptionId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, eventType, subscriptionId })
}
