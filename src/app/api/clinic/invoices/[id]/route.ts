import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'

/**
 * GET    /api/clinic/invoices/:id   invoice + line items (for the printable view)
 * PATCH  /api/clinic/invoices/:id   cancel an invoice (status -> cancelled; no hard delete, for audit)
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const { data: invoice, error } = await db
    .from('clinic_invoices')
    .select('*, patients ( full_name, phone )')
    .eq('id', id)
    .eq('clinic_id', session.clinicId)
    .single()

  if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: items, error: itemsErr } = await db
    .from('clinic_invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order')

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json({ ...invoice, items })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['clinic_admin'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params

  let body: { status?: 'cancelled' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (body.status !== 'cancelled') {
    return NextResponse.json({ error: 'Only cancelling an invoice is supported' }, { status: 400 })
  }

  const db = getDb()
  const { data, error } = await db
    .from('clinic_invoices')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('clinic_id', session.clinicId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
