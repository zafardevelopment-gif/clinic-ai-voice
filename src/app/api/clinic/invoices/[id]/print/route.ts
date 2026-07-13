import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { renderInvoiceHtml } from '@/lib/billing/invoice-html'

/** GET /api/clinic/invoices/:id/print — self-contained HTML invoice, "Save as PDF" via browser print. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const db = getDb()
  const { data: invoice, error } = await db
    .from('clinic_invoices')
    .select('*')
    .eq('id', id)
    .eq('clinic_id', session.clinicId)
    .single()
  if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: items } = await db
    .from('clinic_invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order')

  return new NextResponse(renderInvoiceHtml({ ...invoice, items: items || [] }), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
