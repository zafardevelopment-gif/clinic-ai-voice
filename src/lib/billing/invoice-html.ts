import type { ClinicInvoice, ClinicInvoiceItem, InvoicePartySnapshot } from '@/types/database'

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * Render a GST invoice as a self-contained, print-friendly HTML document —
 * same pattern as lib/reports/monthly-report.ts (browser "Save as PDF",
 * no server-side PDF library needed).
 */
export function renderInvoiceHtml(invoice: ClinicInvoice & { items: ClinicInvoiceItem[] }): string {
  const seller = invoice.seller_snapshot as unknown as InvoicePartySnapshot
  const buyer = invoice.buyer_snapshot as unknown as InvoicePartySnapshot

  const rows = invoice.items
    .map((item, i) => {
      const gstAmount = Math.round((item.amount_paise * item.gst_rate_percent) / 100)
      return `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(item.description)}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">${rupees(item.rate_paise)}</td>
        <td style="text-align:right">${rupees(item.amount_paise)}</td>
        <td style="text-align:right">${item.gst_rate_percent}%</td>
        <td style="text-align:right">${rupees(gstAmount)}</td>
      </tr>`
    })
    .join('')

  const taxRows = invoice.is_interstate
    ? `<div class="totals-row"><span>IGST</span><span>${rupees(invoice.igst_paise)}</span></div>`
    : `<div class="totals-row"><span>CGST</span><span>${rupees(invoice.cgst_paise)}</span></div>
       <div class="totals-row"><span>SGST</span><span>${rupees(invoice.sgst_paise)}</span></div>`

  return `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>Invoice ${invoice.invoice_number}</title>
<style>
  :root { --acc: #10b981; --txt: #0f1f17; --txt2: #4b5d54; --b: #e4ebe7; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: var(--txt); margin: 0; padding: 32px; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: var(--txt2); font-size: 13px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
  .badge.issued { background: #d1fae5; color: #047857; }
  .badge.cancelled { background: #fee2e2; color: #b91c1c; }
  .invoice-meta { text-align: right; }
  .invoice-meta .num { font-size: 20px; font-weight: 800; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .party { border: 1px solid var(--b); border-radius: 10px; padding: 14px; }
  .party .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--txt2); margin-bottom: 6px; }
  .party .name { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
  .party .line { font-size: 12.5px; color: var(--txt2); line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th, td { padding: 8px 10px; border-bottom: 1px solid var(--b); text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; color: var(--txt2); }
  .totals { margin-left: auto; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; color: var(--txt2); }
  .totals-row.grand { font-size: 16px; font-weight: 800; color: var(--txt); border-top: 1px solid var(--b); margin-top: 6px; padding-top: 8px; }
  .footer { margin-top: 32px; font-size: 11px; color: var(--txt2); border-top: 1px solid var(--b); padding-top: 12px; }
  .notes { margin-top: 16px; font-size: 12.5px; color: var(--txt2); }
  @media print { body { padding: 16px; } .no-print { display: none; } }
  .actions button { background: var(--acc); color: white; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }
</style>
</head><body>

<div class="actions no-print" style="margin-bottom:16px;">
  <button onclick="window.print()">Print / Save as PDF</button>
</div>

<div class="header">
  <div>
    <h1>${escapeHtml(seller.name)}</h1>
    <div class="sub">
      ${[seller.address, seller.city, seller.state, seller.pincode].filter(Boolean).join(', ')}<br/>
      ${seller.gstin ? `GSTIN: <strong>${escapeHtml(seller.gstin)}</strong><br/>` : ''}
      ${[seller.phone, seller.email].filter(Boolean).join(' · ')}
    </div>
  </div>
  <div class="invoice-meta">
    <div class="num">${escapeHtml(invoice.invoice_number)}</div>
    <div class="sub">Date: ${invoice.invoice_date}</div>
    <div style="margin-top:6px"><span class="badge ${invoice.status}">${invoice.status}</span></div>
  </div>
</div>

<div class="parties">
  <div class="party">
    <div class="label">Bill To</div>
    <div class="name">${escapeHtml(buyer.name)}</div>
    ${buyer.address ? `<div class="line">${escapeHtml(buyer.address)}</div>` : ''}
    ${buyer.state ? `<div class="line">State: ${escapeHtml(buyer.state)}</div>` : ''}
    ${buyer.gstin ? `<div class="line">GSTIN: ${escapeHtml(buyer.gstin)}</div>` : ''}
    ${buyer.phone ? `<div class="line">${escapeHtml(buyer.phone)}</div>` : ''}
  </div>
  <div class="party">
    <div class="label">Tax Type</div>
    <div class="line">${invoice.is_interstate ? 'Inter-state supply — IGST applicable' : 'Intra-state supply — CGST + SGST applicable'}</div>
  </div>
</div>

<table>
  <thead>
    <tr><th>#</th><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th><th style="text-align:right">GST</th><th style="text-align:right">Tax</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>${rupees(invoice.subtotal_paise)}</span></div>
  ${taxRows}
  <div class="totals-row grand"><span>Total</span><span>${rupees(invoice.total_paise)}</span></div>
</div>

${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${escapeHtml(invoice.notes)}</div>` : ''}

<div class="footer">
  Generated by ClinicAI · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
</div>

</body></html>`
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
