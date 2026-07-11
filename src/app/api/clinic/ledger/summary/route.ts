import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET /api/clinic/ledger/summary?from=&to=
 *
 * Totals for the given date range (default: current calendar month).
 * amount_paise is always a positive magnitude; is_credit determines sign.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const from = searchParams.get('from') || defaultFrom
  const to = searchParams.get('to') || new Date().toISOString().slice(0, 10)

  const db = getDb()
  const { data, error } = await db
    .from('clinic_ledger_entries')
    .select('entry_type, amount_paise, is_credit')
    .eq('clinic_id', session.clinicId)
    .gte('entry_date', from)
    .lte('entry_date', to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data || []
  const totalCollectedPaise = rows.filter(r => r.entry_type === 'patient_collection').reduce((s, r) => s + r.amount_paise, 0)
  const totalRefundedPaise = rows.filter(r => r.entry_type === 'patient_refund').reduce((s, r) => s + r.amount_paise, 0)
  const totalStaffExpensePaise = rows.filter(r => r.entry_type === 'staff_expense').reduce((s, r) => s + r.amount_paise, 0)
  const totalClinicExpensePaise = rows.filter(r => r.entry_type === 'clinic_expense').reduce((s, r) => s + r.amount_paise, 0)
  const otherNetPaise = rows
    .filter(r => r.entry_type === 'other')
    .reduce((s, r) => s + (r.is_credit ? r.amount_paise : -r.amount_paise), 0)

  const netPaise = totalCollectedPaise - totalRefundedPaise - totalStaffExpensePaise - totalClinicExpensePaise + otherNetPaise

  return NextResponse.json({
    from,
    to,
    totalCollected: totalCollectedPaise / 100,
    totalRefunded: totalRefundedPaise / 100,
    totalStaffExpense: totalStaffExpensePaise / 100,
    totalClinicExpense: totalClinicExpensePaise / 100,
    otherNet: otherNetPaise / 100,
    net: netPaise / 100,
  })
}
