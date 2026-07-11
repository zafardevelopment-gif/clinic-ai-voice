'use client'

import { useEffect, useState } from 'react'
import AppModal from '@/components/ui/AppModal'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppSelect, AppTextarea } from '@/components/ui/FormField'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  entryType: 'patient_collection' | 'patient_refund'
  patientId: string | null
  patientName?: string
  appointmentId?: string | null
  /** Prefill amount, e.g. the doctor's consultation_fee. */
  defaultAmount?: number | null
}

/**
 * One-click "collect payment" / "refund" for a specific appointment/patient
 * — a trimmed-down version of the full ledger entry form (no type picker,
 * no patient search; the caller already knows both).
 */
export default function LedgerQuickEntryModal({ open, onClose, onSaved, entryType, patientId, patientName, appointmentId, defaultAmount }: Props) {
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setAmount(defaultAmount ? String(defaultAmount) : '')
      setPaymentMethod('cash')
      setNote('')
      setError('')
    }
  }, [open, defaultAmount])

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
          patient_id: patientId,
          appointment_id: appointmentId || null,
          payment_method: paymentMethod || null,
          note: note || null,
          entry_date: new Date().toISOString().slice(0, 10),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save entry'); return }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={entryType === 'patient_collection' ? `Collect Payment${patientName ? ' — ' + patientName : ''}` : `Refund${patientName ? ' — ' + patientName : ''}`}
      footer={
        <>
          <AppBtn variant="secondary" onClick={onClose}>Cancel</AppBtn>
          <AppBtn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</AppBtn>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>{error}</div>
        )}
        <FormField label="Amount (₹)" required>
          <AppInput type="number" min={0} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" autoFocus />
        </FormField>
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
          <AppTextarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="e.g. Consultation fee" />
        </FormField>
      </div>
    </AppModal>
  )
}
