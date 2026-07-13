import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import { computeInvoice, isInterstate, nextInvoiceNumber, type InvoiceLineInput } from '@/lib/billing/invoice'
import type { InvoicePartySnapshot } from '@/types/database'

/**
 * GET  /api/clinic/invoices    list invoices for the clinic
 * POST /api/clinic/invoices    generate a new GST invoice (optionally from a ledger entry)
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const patientId = searchParams.get('patient_id')

  const db = getDb()
  let q = db
    .from('clinic_invoices')
    .select('*, patients ( full_name, phone )')
    .eq('clinic_id', session.clinicId)
    .order('invoice_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)

  if (patientId) q = q.eq('patient_id', patientId)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!requireRole(session, ['clinic_admin', 'receptionist'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    patient_id?: string | null
    ledger_entry_id?: string | null
    invoice_date?: string
    notes?: string | null
    buyer_gstin?: string | null
    buyer_state?: string | null
    lines: InvoiceLineInput[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
  }
  for (const line of body.lines) {
    if (!line.description || !line.quantity || line.quantity <= 0 || line.rate_paise == null || line.rate_paise < 0) {
      return NextResponse.json({ error: 'Each line needs a description, quantity > 0, and a rate' }, { status: 400 })
    }
  }

  const db = getDb()

  const { data: clinic, error: clinicErr } = await db
    .from('clinics')
    .select('id, name, phone, email, address, city, state, pincode, gstin, invoice_prefix')
    .eq('id', session.clinicId)
    .single()
  if (clinicErr || !clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  let patient: { full_name: string; phone: string | null; address: string | null; gstin: string | null; state: string | null } | null = null
  if (body.patient_id) {
    const { data } = await db
      .from('patients')
      .select('full_name, phone, address, gstin, state')
      .eq('id', body.patient_id)
      .eq('clinic_id', session.clinicId)
      .single()
    patient = data
  }

  const buyerState = body.buyer_state || patient?.state || null
  const buyerGstin = body.buyer_gstin || patient?.gstin || null
  const interstate = isInterstate(clinic.state, buyerState)

  const { lines, totals } = computeInvoice(body.lines, interstate)

  const year = new Date(body.invoice_date || Date.now()).getFullYear()
  const yearStart = `${year}-01-01`
  const yearEnd = `${year + 1}-01-01`
  const { count } = await db
    .from('clinic_invoices')
    .select('id', { count: 'exact', head: true })
    .eq('clinic_id', session.clinicId)
    .gte('invoice_date', yearStart)
    .lt('invoice_date', yearEnd)

  const invoiceNumber = nextInvoiceNumber(clinic.invoice_prefix || 'INV', count || 0, year)

  const sellerSnapshot: InvoicePartySnapshot = {
    name: clinic.name,
    address: clinic.address,
    city: clinic.city,
    state: clinic.state,
    pincode: clinic.pincode,
    gstin: clinic.gstin,
    phone: clinic.phone,
    email: clinic.email,
  }
  const buyerSnapshot: InvoicePartySnapshot = {
    name: patient?.full_name || 'Walk-in Patient',
    address: patient?.address || null,
    state: buyerState,
    gstin: buyerGstin,
    phone: patient?.phone || null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- supabase-js overload
  // inference breaks on inserts mixing Json columns with plain scalars (same issue
  // as clinic_website_content's insert in api/clinic/website/route.ts).
  const { data: invoice, error: invoiceErr } = await (db.from('clinic_invoices') as any)
    .insert({
      clinic_id: session.clinicId,
      invoice_number: invoiceNumber,
      invoice_date: body.invoice_date || new Date().toISOString().slice(0, 10),
      patient_id: body.patient_id || null,
      ledger_entry_id: body.ledger_entry_id || null,
      seller_snapshot: sellerSnapshot,
      buyer_snapshot: buyerSnapshot,
      subtotal_paise: totals.subtotal_paise,
      cgst_paise: totals.cgst_paise,
      sgst_paise: totals.sgst_paise,
      igst_paise: totals.igst_paise,
      total_paise: totals.total_paise,
      is_interstate: interstate,
      notes: body.notes || null,
      created_by: session.userId,
    })
    .select()
    .single()

  if (invoiceErr || !invoice) return NextResponse.json({ error: invoiceErr?.message || 'Failed to create invoice' }, { status: 500 })

  const { error: itemsErr } = await db.from('clinic_invoice_items').insert(
    lines.map((l, i) => ({
      invoice_id: invoice.id,
      description: l.description,
      quantity: l.quantity,
      rate_paise: l.rate_paise,
      gst_rate_percent: l.gst_rate_percent,
      amount_paise: l.amount_paise,
      sort_order: i,
    })),
  )
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  return NextResponse.json(invoice, { status: 201 })
}
