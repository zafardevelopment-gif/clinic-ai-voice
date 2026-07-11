import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'
import { requireRole } from '@/lib/authz'
import type { LedgerEntryType, LedgerPaymentMethod } from '@/types/database'

const CREDIT_TYPES: LedgerEntryType[] = ['patient_collection']
const DEBIT_TYPES: LedgerEntryType[] = ['patient_refund', 'staff_expense', 'clinic_expense']

/**
 * GET  /api/clinic/ledger    list entries, filterable by ?type= and date range
 * POST /api/clinic/ledger    record a new entry (clinic_admin / receptionist)
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const entryType = searchParams.get('type')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const db = getDb()
  let q = db
    .from('clinic_ledger_entries')
    .select('*, patients ( full_name, phone ), appointments ( appointment_date, appointment_time )')
    .eq('clinic_id', session.clinicId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(300)

  if (entryType) q = q.eq('entry_type', entryType as LedgerEntryType)
  if (from) q = q.gte('entry_date', from)
  if (to) q = q.lte('entry_date', to)

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
    entry_type: LedgerEntryType
    amount_rupees: number
    is_credit?: boolean
    appointment_id?: string | null
    patient_id?: string | null
    related_entry_id?: string | null
    payment_method?: LedgerPaymentMethod | null
    note?: string | null
    entry_date?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body.entry_type) return NextResponse.json({ error: 'entry_type required' }, { status: 400 })
  if (!body.amount_rupees || body.amount_rupees <= 0) {
    return NextResponse.json({ error: 'amount_rupees must be a positive number' }, { status: 400 })
  }
  if (body.entry_type === 'patient_refund' && !body.related_entry_id) {
    return NextResponse.json({ error: 'related_entry_id is required for a refund entry' }, { status: 400 })
  }

  // is_credit is derived from entry_type unless it's 'other', where the
  // caller (a form toggle) decides the direction.
  let isCredit = body.is_credit ?? true
  if (CREDIT_TYPES.includes(body.entry_type)) isCredit = true
  if (DEBIT_TYPES.includes(body.entry_type)) isCredit = false

  const db = getDb()
  const { data, error } = await db
    .from('clinic_ledger_entries')
    .insert({
      clinic_id: session.clinicId,
      entry_type: body.entry_type,
      amount_paise: Math.round(body.amount_rupees * 100),
      is_credit: isCredit,
      appointment_id: body.appointment_id || null,
      patient_id: body.patient_id || null,
      related_entry_id: body.related_entry_id || null,
      payment_method: body.payment_method || null,
      note: body.note || null,
      entry_date: body.entry_date || new Date().toISOString().slice(0, 10),
      created_by: session.userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
