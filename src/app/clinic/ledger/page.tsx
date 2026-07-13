'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import AppModal from '@/components/ui/AppModal'
import StatCard from '@/components/ui/StatCard'
import DataTable from '@/components/ui/DataTable'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'
import PatientSearchSelect, { type PatientOption } from '@/components/clinic/PatientSearchSelect'
import GenerateInvoiceModal from '@/components/clinic/GenerateInvoiceModal'

type EntryType = 'patient_collection' | 'patient_refund' | 'staff_expense' | 'clinic_expense' | 'other'

interface LedgerEntry {
  id: string
  entry_type: EntryType
  amount_paise: number
  is_credit: boolean
  payment_method: string | null
  note: string | null
  entry_date: string
  patient_id?: string | null
  patients: { full_name: string; phone: string | null } | null
}

interface Summary {
  totalCollected: number
  totalRefunded: number
  totalStaffExpense: number
  totalClinicExpense: number
  net: number
}

interface PnlMonth {
  month: string
  income: number
  expense: number
  profit: number
}

const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  patient_collection: 'Patient Collection',
  patient_refund: 'Patient Refund',
  staff_expense: 'Staff Expense',
  clinic_expense: 'Clinic Expense',
  other: 'Other',
}

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function LedgerPage() {
  const [tab, setTab] = useState<'log' | 'pnl'>('log')
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pnl, setPnl] = useState<{ months: PnlMonth[]; totals: { income: number; expense: number; profit: number } } | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | EntryType>('all')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const [patients, setPatients] = useState<PatientOption[]>([])
  const [entryType, setEntryType] = useState<EntryType>('patient_collection')
  const [amount, setAmount] = useState('')
  const [patientId, setPatientId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [invoiceSourceEntry, setInvoiceSourceEntry] = useState<LedgerEntry | null>(null)

  function openInvoiceFor(entry: LedgerEntry) {
    setInvoiceSourceEntry(entry)
    setInvoiceModalOpen(true)
  }

  async function load() {
    setLoading(true)
    const url = typeFilter === 'all' ? '/api/clinic/ledger' : `/api/clinic/ledger?type=${typeFilter}`
    const [entriesRes, summaryRes] = await Promise.all([
      fetch(url).then(r => r.json()),
      fetch('/api/clinic/ledger/summary').then(r => r.json()),
    ])
    setEntries(Array.isArray(entriesRes) ? entriesRes : [])
    setSummary(summaryRes)
    setLoading(false)
  }
  useEffect(() => { load() }, [typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'pnl') {
      fetch('/api/clinic/ledger/pnl?months=6').then(r => r.json()).then(setPnl)
    }
  }, [tab])

  function openNew(presetType: EntryType = 'patient_collection') {
    setEntryType(presetType)
    setAmount('')
    setPatientId('')
    setPaymentMethod('cash')
    setNote('')
    setEntryDate(new Date().toISOString().slice(0, 10))
    setError('')
    setOpen(true)
    if (patients.length === 0) {
      fetch('/api/clinic/patients').then(r => r.json()).then(d => setPatients(Array.isArray(d) ? d : []))
    }
  }

  async function save() {
    setError('')
    const amountRupees = parseFloat(amount)
    if (!amountRupees || amountRupees <= 0) { setError('Enter a valid amount'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/clinic/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_type: entryType,
          amount_rupees: amountRupees,
          patient_id: (entryType === 'patient_collection' || entryType === 'patient_refund') ? (patientId || null) : null,
          payment_method: paymentMethod || null,
          note: note || null,
          entry_date: entryDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save entry'); return }
      setOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const showsPatient = entryType === 'patient_collection' || entryType === 'patient_refund'

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Ledger"
        subtitle="Patient collections, refunds, staff & clinic expenses"
        actions={
          <div className="flex gap-2">
            <AppBtn variant="secondary" icon="💰" onClick={() => openNew('patient_collection')}>Collect Payment</AppBtn>
            <AppBtn variant="secondary" icon="↩️" onClick={() => openNew('patient_refund')}>Refund</AppBtn>
            <AppBtn icon="+" onClick={() => openNew('patient_collection')}>New Entry</AppBtn>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-1.5 mb-4">
          {([['log', 'Ledger'], ['pnl', 'Profit & Loss']] as [typeof tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={{
                background: tab === key ? 'var(--acc-dim)' : 'var(--s3)',
                border: `1px solid ${tab === key ? 'var(--acc)' : 'var(--b2)'}`,
                color: tab === key ? 'var(--acc)' : 'var(--txt2)',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'log' ? (
          <>
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mb-4">
                <StatCard icon="💰" label="Collected (MTD)" value={rupees(summary.totalCollected)} color="teal" />
                <StatCard icon="↩️" label="Refunded (MTD)" value={rupees(summary.totalRefunded)} color="rose" />
                <StatCard icon="🧑‍⚕️" label="Staff Expense (MTD)" value={rupees(summary.totalStaffExpense)} color="amber" />
                <StatCard icon="🏥" label="Clinic Expense (MTD)" value={rupees(summary.totalClinicExpense)} color="violet" />
                <StatCard icon="📊" label="Net (MTD)" value={rupees(summary.net)} color="blue" />
              </div>
            )}

            <div className="flex gap-1.5 mb-4 flex-wrap">
              {(['all', 'patient_collection', 'patient_refund', 'staff_expense', 'clinic_expense', 'other'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: typeFilter === t ? 'var(--acc-dim)' : 'var(--s3)',
                    border: `1px solid ${typeFilter === t ? 'var(--acc)' : 'var(--b2)'}`,
                    color: typeFilter === t ? 'var(--acc)' : 'var(--txt2)',
                    cursor: 'pointer',
                  }}
                >
                  {t === 'all' ? 'All' : ENTRY_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            <PageCard noPad>
              {loading ? (
                <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
              ) : (
                <DataTable<LedgerEntry>
                  emptyMessage="No ledger entries yet"
                  emptyIcon="💵"
                  columns={[
                    { key: 'entry_date', header: 'Date' },
                    { key: 'entry_type', header: 'Type', render: (r) => (
                      <span className="text-xs font-medium" style={{ color: r.is_credit ? 'var(--teal)' : 'var(--rose)' }}>
                        {ENTRY_TYPE_LABELS[r.entry_type]}
                      </span>
                    ) },
                    { key: 'patient', header: 'Patient', render: (r) => r.patients?.full_name || '—' },
                    { key: 'amount', header: 'Amount', render: (r) => (
                      <span className="font-semibold" style={{ color: r.is_credit ? 'var(--teal)' : 'var(--rose)' }}>
                        {r.is_credit ? '+' : '-'}{rupees(r.amount_paise / 100)}
                      </span>
                    ) },
                    { key: 'payment_method', header: 'Method', render: (r) => <span className="capitalize text-xs" style={{ color: 'var(--txt2)' }}>{r.payment_method || '—'}</span> },
                    { key: 'note', header: 'Note' },
                    {
                      key: 'actions', header: '', render: (r) => (
                        r.entry_type === 'patient_collection' ? (
                          <AppBtn size="sm" variant="secondary" icon="🧾" onClick={() => openInvoiceFor(r)}>Invoice</AppBtn>
                        ) : null
                      ),
                    },
                  ]}
                  data={entries}
                />
              )}
            </PageCard>
          </>
        ) : (
          <PageCard title="Profit & Loss" subtitle="Cash-basis: income vs expense by month (last 6 months)">
            {!pnl ? (
              <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3.5 mb-5">
                  <StatCard icon="📈" label="Total Income" value={rupees(pnl.totals.income)} color="teal" />
                  <StatCard icon="📉" label="Total Expense" value={rupees(pnl.totals.expense)} color="rose" />
                  <StatCard icon="💹" label="Net Profit" value={rupees(pnl.totals.profit)} color={pnl.totals.profit >= 0 ? 'blue' : 'rose'} />
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Month', 'Income', 'Expense', 'Profit'].map(h => (
                        <th key={h} className="text-left text-[11px] uppercase tracking-[1.2px] px-4 py-2.5 font-semibold" style={{ color: 'var(--txt3)', borderBottom: '1px solid var(--b1)', background: 'var(--s1)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pnl.months.map((m, i) => (
                      <tr key={m.month}>
                        <td className="px-4 py-2.5 text-sm" style={{ borderBottom: i < pnl.months.length - 1 ? '1px solid var(--b1)' : 'none', color: 'var(--txt)' }}>{m.month}</td>
                        <td className="px-4 py-2.5 text-sm" style={{ borderBottom: i < pnl.months.length - 1 ? '1px solid var(--b1)' : 'none', color: 'var(--teal)' }}>{rupees(m.income)}</td>
                        <td className="px-4 py-2.5 text-sm" style={{ borderBottom: i < pnl.months.length - 1 ? '1px solid var(--b1)' : 'none', color: 'var(--rose)' }}>{rupees(m.expense)}</td>
                        <td className="px-4 py-2.5 text-sm font-semibold" style={{ borderBottom: i < pnl.months.length - 1 ? '1px solid var(--b1)' : 'none', color: m.profit >= 0 ? 'var(--txt)' : 'var(--rose)' }}>{rupees(m.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </PageCard>
        )}
      </div>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title="New Ledger Entry"
        footer={
          <>
            <AppBtn variant="secondary" onClick={() => setOpen(false)}>Cancel</AppBtn>
            <AppBtn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</AppBtn>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
          )}
          <FormField label="Type" required>
            <AppSelect value={entryType} onChange={e => setEntryType(e.target.value as EntryType)}>
              {(Object.keys(ENTRY_TYPE_LABELS) as EntryType[]).map(t => (
                <option key={t} value={t}>{ENTRY_TYPE_LABELS[t]}</option>
              ))}
            </AppSelect>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount (₹)" required>
              <AppInput type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" />
            </FormField>
            <FormField label="Date" required>
              <AppInput type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </FormField>
          </div>

          {showsPatient && (
            <FormField label="Patient" hint="Optional">
              <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
            </FormField>
          )}

          <FormField label="Payment method">
            <AppSelect value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </AppSelect>
          </FormField>

          <FormField label="Note">
            <AppTextarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="e.g. Consultation fee, staff salary advance…" />
          </FormField>
        </div>
      </AppModal>

      <GenerateInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        onCreated={id => window.open(`/api/clinic/invoices/${id}/print`, '_blank')}
        presetPatientId={invoiceSourceEntry?.patient_id || null}
        presetLedgerEntryId={invoiceSourceEntry?.id || null}
        presetAmount={invoiceSourceEntry ? invoiceSourceEntry.amount_paise / 100 : null}
        presetDescription={invoiceSourceEntry?.note || 'Consultation fee'}
      />
    </div>
  )
}
