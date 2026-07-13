'use client'

import { useEffect, useState } from 'react'
import AppModal from '@/components/ui/AppModal'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppTextarea } from '@/components/ui/FormField'
import PatientSearchSelect, { type PatientOption } from '@/components/clinic/PatientSearchSelect'

interface LineItem {
  description: string
  quantity: string
  rate: string
  gstRate: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (invoiceId: string) => void
  /** Pre-fill from a ledger "Collect Payment" entry. */
  presetPatientId?: string | null
  presetLedgerEntryId?: string | null
  presetAmount?: number | null
  presetDescription?: string | null
}

const emptyLine = (): LineItem => ({ description: '', quantity: '1', rate: '', gstRate: '0' })

export default function GenerateInvoiceModal({ open, onClose, onCreated, presetPatientId, presetLedgerEntryId, presetAmount, presetDescription }: Props) {
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [patientId, setPatientId] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<LineItem[]>([emptyLine()])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPatientId(presetPatientId || '')
    setInvoiceDate(new Date().toISOString().slice(0, 10))
    setLines([{ ...emptyLine(), description: presetDescription || 'Consultation fee', rate: presetAmount ? String(presetAmount) : '' }])
    setNotes('')
    setError('')
    if (patients.length === 0) {
      fetch('/api/clinic/patients').then(r => r.json()).then(d => setPatients(Array.isArray(d) ? d : []))
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateLine(i: number, patch: Partial<LineItem>) {
    setLines(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function addLine() {
    setLines(ls => [...ls, emptyLine()])
  }
  function removeLine(i: number) {
    setLines(ls => ls.filter((_, idx) => idx !== i))
  }

  const total = lines.reduce((sum, l) => {
    const qty = parseFloat(l.quantity) || 0
    const rate = parseFloat(l.rate) || 0
    const gst = parseFloat(l.gstRate) || 0
    return sum + qty * rate * (1 + gst / 100)
  }, 0)

  async function save() {
    setError('')
    if (lines.length === 0) { setError('Add at least one line item'); return }
    for (const l of lines) {
      if (!l.description.trim()) { setError('Every line needs a description'); return }
      if (!l.quantity || parseFloat(l.quantity) <= 0) { setError('Quantity must be greater than 0'); return }
      if (l.rate === '' || parseFloat(l.rate) < 0) { setError('Enter a valid rate'); return }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/clinic/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId || null,
          ledger_entry_id: presetLedgerEntryId || null,
          invoice_date: invoiceDate,
          notes: notes || null,
          lines: lines.map(l => ({
            description: l.description.trim(),
            quantity: parseFloat(l.quantity),
            rate_paise: Math.round(parseFloat(l.rate) * 100),
            gst_rate_percent: parseFloat(l.gstRate) || 0,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to generate invoice'); return }
      onCreated(data.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Generate Invoice"
      size="lg"
      footer={
        <>
          <AppBtn variant="secondary" onClick={onClose}>Cancel</AppBtn>
          <AppBtn onClick={save} disabled={saving}>{saving ? 'Generating…' : 'Generate Invoice'}</AppBtn>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Patient" hint="Leave blank for walk-in / cash patient">
            <PatientSearchSelect patients={patients} value={patientId} onChange={setPatientId} />
          </FormField>
          <FormField label="Invoice Date" required>
            <AppInput type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
          </FormField>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.6px]" style={{ color: 'var(--txt2)' }}>Line Items</label>
            <button type="button" onClick={addLine} className="text-xs font-medium" style={{ color: 'var(--acc)', cursor: 'pointer', background: 'none', border: 'none' }}>+ Add line</button>
          </div>
          <div className="space-y-2">
            {lines.map((line, i) => (
              <div key={i} className="grid gap-2 items-start" style={{ gridTemplateColumns: '1fr 70px 90px 70px 24px' }}>
                <AppInput placeholder="Description (e.g. Consultation fee)" value={line.description} onChange={e => updateLine(i, { description: e.target.value })} />
                <AppInput type="number" min={0} step="1" placeholder="Qty" value={line.quantity} onChange={e => updateLine(i, { quantity: e.target.value })} />
                <AppInput type="number" min={0} step="0.01" placeholder="Rate ₹" value={line.rate} onChange={e => updateLine(i, { rate: e.target.value })} />
                <AppInput type="number" min={0} step="0.01" placeholder="GST %" value={line.gstRate} onChange={e => updateLine(i, { gstRate: e.target.value })} />
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  disabled={lines.length === 1}
                  style={{ color: 'var(--txt3)', cursor: lines.length === 1 ? 'not-allowed' : 'pointer', background: 'none', border: 'none', height: 40 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--txt3)' }}>
            Healthcare consultations are usually GST-exempt in India — leave GST% at 0 unless the line is a taxable product/service.
          </p>
        </div>

        <FormField label="Notes">
          <AppTextarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes to print on the invoice" />
        </FormField>

        <div className="flex justify-end pt-2" style={{ borderTop: '1px solid var(--b1)' }}>
          <div className="text-sm pt-2" style={{ color: 'var(--txt2)' }}>
            Estimated total: <span className="font-semibold" style={{ color: 'var(--txt)' }}>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>
    </AppModal>
  )
}
