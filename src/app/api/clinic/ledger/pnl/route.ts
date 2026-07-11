import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET /api/clinic/ledger/pnl?months=6
 *
 * Simple profit & loss: income (patient collections, net of refunds, plus
 * any credit 'other' entries) vs expenses (staff + clinic + debit 'other'),
 * broken down by calendar month for the trailing N months (default 6, max 12).
 *
 * Not a formal accrual-basis P&L (no depreciation, no accruals) — this is a
 * cash-basis view matching what the ledger actually records, which is the
 * right level of complexity for a single small clinic's cashbook.
 */
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || !session.clinicId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const months = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('months') || '6', 10) || 6, 1), 12)

  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
  const from = rangeStart.toISOString().slice(0, 10)
  const to = new Date().toISOString().slice(0, 10)

  const db = getDb()
  const { data, error } = await db
    .from('clinic_ledger_entries')
    .select('entry_type, amount_paise, is_credit, entry_date')
    .eq('clinic_id', session.clinicId)
    .gte('entry_date', from)
    .lte('entry_date', to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bucket by YYYY-MM.
  const buckets = new Map<string, { income: number; expense: number; collected: number; refunded: number; staffExpense: number; clinicExpense: number; otherNet: number }>()
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, { income: 0, expense: 0, collected: 0, refunded: 0, staffExpense: 0, clinicExpense: 0, otherNet: 0 })
  }

  for (const row of data || []) {
    const key = row.entry_date.slice(0, 7)
    const bucket = buckets.get(key)
    if (!bucket) continue

    const rupees = row.amount_paise / 100
    switch (row.entry_type) {
      case 'patient_collection':
        bucket.collected += rupees
        bucket.income += rupees
        break
      case 'patient_refund':
        bucket.refunded += rupees
        bucket.income -= rupees
        break
      case 'staff_expense':
        bucket.staffExpense += rupees
        bucket.expense += rupees
        break
      case 'clinic_expense':
        bucket.clinicExpense += rupees
        bucket.expense += rupees
        break
      case 'other':
        if (row.is_credit) {
          bucket.otherNet += rupees
          bucket.income += rupees
        } else {
          bucket.otherNet -= rupees
          bucket.expense += rupees
        }
        break
    }
  }

  const monthly = Array.from(buckets.entries()).map(([month, b]) => ({
    month,
    income: Math.round(b.income * 100) / 100,
    expense: Math.round(b.expense * 100) / 100,
    profit: Math.round((b.income - b.expense) * 100) / 100,
    breakdown: {
      patientCollected: Math.round(b.collected * 100) / 100,
      patientRefunded: Math.round(b.refunded * 100) / 100,
      staffExpense: Math.round(b.staffExpense * 100) / 100,
      clinicExpense: Math.round(b.clinicExpense * 100) / 100,
      otherNet: Math.round(b.otherNet * 100) / 100,
    },
  }))

  const totals = monthly.reduce(
    (acc, m) => ({ income: acc.income + m.income, expense: acc.expense + m.expense, profit: acc.profit + m.profit }),
    { income: 0, expense: 0, profit: 0 },
  )

  return NextResponse.json({
    from,
    to,
    months: monthly,
    totals: {
      income: Math.round(totals.income * 100) / 100,
      expense: Math.round(totals.expense * 100) / 100,
      profit: Math.round(totals.profit * 100) / 100,
    },
  })
}
