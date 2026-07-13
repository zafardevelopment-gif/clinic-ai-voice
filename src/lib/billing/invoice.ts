/**
 * GST calculation + invoice numbering helpers.
 *
 * India GST rule of thumb: same state (clinic vs patient) → split the rate
 * into CGST + SGST (half each); different state → the full rate as IGST.
 * If either party's state is unknown, we default to intra-state (CGST+SGST)
 * since most clinics only ever bill local, in-person patients.
 */

export interface InvoiceLineInput {
  description: string
  quantity: number
  rate_paise: number
  gst_rate_percent: number
}

export interface InvoiceLineComputed extends InvoiceLineInput {
  amount_paise: number
  cgst_paise: number
  sgst_paise: number
  igst_paise: number
  line_total_paise: number
}

export interface InvoiceTotals {
  subtotal_paise: number
  cgst_paise: number
  sgst_paise: number
  igst_paise: number
  total_paise: number
}

export function isInterstate(sellerState: string | null | undefined, buyerState: string | null | undefined): boolean {
  if (!sellerState || !buyerState) return false
  return sellerState.trim().toLowerCase() !== buyerState.trim().toLowerCase()
}

export function computeInvoice(
  lines: InvoiceLineInput[],
  interstate: boolean,
): { lines: InvoiceLineComputed[]; totals: InvoiceTotals } {
  const computed: InvoiceLineComputed[] = lines.map(line => {
    const amount = Math.round(line.quantity * line.rate_paise)
    const taxTotal = Math.round((amount * line.gst_rate_percent) / 100)
    const cgst = interstate ? 0 : Math.round(taxTotal / 2)
    const sgst = interstate ? 0 : taxTotal - cgst
    const igst = interstate ? taxTotal : 0
    return {
      ...line,
      amount_paise: amount,
      cgst_paise: cgst,
      sgst_paise: sgst,
      igst_paise: igst,
      line_total_paise: amount + cgst + sgst + igst,
    }
  })

  const totals = computed.reduce<InvoiceTotals>(
    (acc, l) => ({
      subtotal_paise: acc.subtotal_paise + l.amount_paise,
      cgst_paise: acc.cgst_paise + l.cgst_paise,
      sgst_paise: acc.sgst_paise + l.sgst_paise,
      igst_paise: acc.igst_paise + l.igst_paise,
      total_paise: acc.total_paise + l.line_total_paise,
    }),
    { subtotal_paise: 0, cgst_paise: 0, sgst_paise: 0, igst_paise: 0, total_paise: 0 },
  )

  return { lines: computed, totals }
}

/** Builds "{PREFIX}-{YYYY}-{seq}" using the count of invoices issued this year for the clinic. */
export function nextInvoiceNumber(prefix: string, yearInvoiceCount: number, year: number): string {
  const seq = String(yearInvoiceCount + 1).padStart(4, '0')
  return `${prefix}-${year}-${seq}`
}
