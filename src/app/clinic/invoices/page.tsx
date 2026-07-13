'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import DataTable from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import GenerateInvoiceModal from '@/components/clinic/GenerateInvoiceModal'

interface InvoiceRow {
  id: string
  invoice_number: string
  invoice_date: string
  total_paise: number
  status: 'issued' | 'cancelled'
  is_interstate: boolean
  patients: { full_name: string; phone: string | null } | null
}

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  async function load() {
    setLoading(true)
    const data = await fetch('/api/clinic/invoices').then(r => r.json())
    setInvoices(Array.isArray(data) ? data : [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function openPrint(id: string) {
    window.open(`/api/clinic/invoices/${id}/print`, '_blank')
  }

  async function cancelInvoice(id: string) {
    if (!confirm('Cancel this invoice? It will be kept for records but marked cancelled.')) return
    const res = await fetch(`/api/clinic/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    })
    if (res.ok) load()
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="Invoices"
        subtitle="GST invoices generated for patients"
        actions={<AppBtn icon="+" onClick={() => setOpen(true)}>Generate Invoice</AppBtn>}
      />
      <div className="flex-1 overflow-y-auto p-6">
        <PageCard noPad>
          {loading ? (
            <div className="p-8 text-sm text-center" style={{ color: 'var(--txt3)' }}>Loading…</div>
          ) : (
            <DataTable<InvoiceRow>
              emptyMessage="No invoices generated yet"
              emptyIcon="🧾"
              columns={[
                { key: 'invoice_number', header: 'Invoice #', render: r => <span className="font-semibold">{r.invoice_number}</span> },
                { key: 'invoice_date', header: 'Date' },
                { key: 'patient', header: 'Patient', render: r => r.patients?.full_name || 'Walk-in' },
                { key: 'tax', header: 'Tax Type', render: r => <span className="text-xs" style={{ color: 'var(--txt2)' }}>{r.is_interstate ? 'IGST' : 'CGST+SGST'}</span> },
                { key: 'total', header: 'Total', render: r => <span className="font-semibold">{rupees(r.total_paise)}</span> },
                { key: 'status', header: 'Status', render: r => <StatusBadge variant={r.status} /> },
                {
                  key: 'actions', header: '', render: r => (
                    <div className="flex gap-2">
                      <AppBtn size="sm" variant="secondary" onClick={() => openPrint(r.id)}>Print / PDF</AppBtn>
                      {r.status === 'issued' && (
                        <AppBtn size="sm" variant="danger" onClick={() => cancelInvoice(r.id)}>Cancel</AppBtn>
                      )}
                    </div>
                  ),
                },
              ]}
              data={invoices}
            />
          )}
        </PageCard>
      </div>

      <GenerateInvoiceModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={id => { load(); openPrint(id) }}
      />
    </div>
  )
}
