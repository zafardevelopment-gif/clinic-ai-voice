import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import type { Database } from '@/types/database'

type AlertUpdate = Database['public']['Tables']['adherence_alerts']['Update']

/** PATCH /api/clinic/adherence/alerts/[id] — acknowledge or resolve an alert. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { status?: 'acknowledged' | 'resolved' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.status || !['acknowledged', 'resolved'].includes(body.status)) {
    return NextResponse.json({ error: 'status must be acknowledged or resolved' }, { status: 400 })
  }

  const db = getDb()
  const patch: AlertUpdate = { status: body.status, acknowledged_by: session.userId }
  if (body.status === 'resolved') patch.resolved_at = new Date().toISOString()

  const { data, error } = await db
    .from('adherence_alerts')
    .update(patch)
    .eq('id', params.id)
    .eq('clinic_id', session.clinicId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
