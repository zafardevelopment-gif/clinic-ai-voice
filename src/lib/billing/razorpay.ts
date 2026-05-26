/**
 * Razorpay subscription helpers — PLACEHOLDER.
 *
 * Status: scaffolded but not wired to real Razorpay yet. Each function
 * throws a clear error so any accidental call in production is loud,
 * not silent.
 *
 * To complete this integration:
 *   1. Create a Razorpay account → get RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET
 *   2. In Razorpay dashboard, create one "Plan" per row in the
 *      subscription_plans table (basic/pro/premium). Save each plan_id back
 *      onto our subscription_plans table in a new razorpay_plan_id column.
 *   3. Implement createCustomer / createSubscription / cancelSubscription
 *      below using the Razorpay Node SDK (`npm install razorpay`).
 *   4. Wire RAZORPAY_WEBHOOK_SECRET in dashboard and verify in the webhook
 *      route at app/api/webhooks/razorpay/route.ts.
 *
 * Why placeholder?
 *   - Manual subscription management already works via /admin/clinics/[id]/subscription.
 *   - Razorpay onboarding (KYC, bank account) takes 2-5 business days for
 *     Indian businesses. Code is ready to drop in when account is live.
 */

export interface CreateCustomerArgs {
  clinicId: string
  name: string
  email: string
  phone?: string
}

export interface CreateSubscriptionArgs {
  clinicId: string
  razorpayCustomerId: string
  razorpayPlanId: string
  /** 'monthly' or 'yearly' — controls total_count: 12 vs 1. */
  cycle: 'monthly' | 'yearly'
}

function notWiredError(action: string): Error {
  return new Error(
    `Razorpay ${action} not implemented yet. ` +
    `See src/lib/billing/razorpay.ts header for setup steps.`,
  )
}

export async function createRazorpayCustomer(_args: CreateCustomerArgs): Promise<string> {
  if (!process.env.RAZORPAY_KEY_ID) {
    throw notWiredError('customer creation')
  }
  // TODO: const rzp = new Razorpay({ key_id: ..., key_secret: ... })
  // TODO: const customer = await rzp.customers.create({ name, email, contact })
  // TODO: persist customer.id onto clinic_subscriptions.razorpay_customer_id
  // TODO: return customer.id
  throw notWiredError('customer creation')
}

export async function createRazorpaySubscription(_args: CreateSubscriptionArgs): Promise<string> {
  if (!process.env.RAZORPAY_KEY_ID) {
    throw notWiredError('subscription creation')
  }
  // TODO: const sub = await rzp.subscriptions.create({
  //   plan_id, customer_id, total_count, notify_info: {...}
  // })
  // TODO: persist sub.id onto clinic_subscriptions.razorpay_subscription_id
  // TODO: set status='trialing' or 'active' based on Razorpay response
  // TODO: return sub.id
  throw notWiredError('subscription creation')
}

export async function cancelRazorpaySubscription(_razorpaySubscriptionId: string): Promise<void> {
  if (!process.env.RAZORPAY_KEY_ID) {
    throw notWiredError('subscription cancellation')
  }
  // TODO: await rzp.subscriptions.cancel(razorpaySubscriptionId, { cancel_at_cycle_end: 1 })
  // TODO: update clinic_subscriptions.cancel_at_period_end = true
  throw notWiredError('subscription cancellation')
}

/**
 * Verify the HMAC-SHA256 signature Razorpay attaches to webhook events.
 * Real implementation when keys are present:
 *
 *   import crypto from 'crypto'
 *   const expected = crypto
 *     .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
 *     .update(rawBody)
 *     .digest('hex')
 *   return expected === signature
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false

  // Lazy crypto import keeps cold-start fast.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto') as typeof import('crypto')
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}
