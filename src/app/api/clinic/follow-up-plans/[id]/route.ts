import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import type { Database } from '@/types/database'

type PlanUpdate = Database['public']['Tables']['follow_up_plans']['Update']

const EDITABLE_FIELDS: (keyof PlanUpdate)[] = ['medicines', 'reminder_frequency', 'follow_up_date', 'care_instructions', 'escalation_contact', 'status']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDb()
  const { data, error } = await db
    .from('follow_up_plans')
    .select('*, patients ( full_name, phone )')
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const { data: logs } = await db
    .from('adherence_logs')
    .select('id, channel, response, note, created_via, logged_at')
    .eq('follow_up_plan_id', params.id)
    .order('logged_at', { ascending: false })

  return NextResponse.json({ ...data, adherence_logs: logs || [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['clinic_admin', 'doctor'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const patch: PlanUpdate = {}
  for (const key of EDITABLE_FIELDS) {
    if (key in body) (patch as Record<string, unknown>)[key] = body[key]
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'no_updatable_fields' }, { status: 400 })

  const db = getDb()
  const { data, error } = await db
    .from('follow_up_plans')
    .update(patch)
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
