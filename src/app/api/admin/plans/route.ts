/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getSession } from '@/lib/session'

/**
 * /api/admin/plans
 *
 * GET   → list all subscription plans, ordered by sort_order
 * PATCH → update a plan by plan_code:
 *           { plan_code, display_name?, monthly_price_inr?, annual_price_inr?,
 *             monthly_call_limit?, features?, is_active? }
 *
 * Only super-admins (role='admin') can hit this route.
 */

function admin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  ) as any
}

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data, error } = await admin()
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ plans: data })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { plan_code, ...updates } = body
  if (!plan_code) {
    return NextResponse.json({ error: 'plan_code is required' }, { status: 400 })
  }

  // Only allow whitelisted fields through — prevents accidental column writes.
  const allowed = [
    'display_name',
    'description',
    'monthly_price_inr',
    'annual_price_inr',
    'monthly_call_limit',
    'features',
    'is_active',
    'sort_order',
  ]
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in updates) patch[key] = updates[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'no_updatable_fields' }, { status: 400 })
  }

  const { data, error } = await admin()
    .from('subscription_plans')
    .update(patch)
    .eq('plan_code', plan_code)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ plan: data })
}
