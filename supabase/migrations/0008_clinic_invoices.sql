-- ═══════════════════════════════════════════════════════════════════════════
-- Clinic Invoicing — GST-ready patient invoices (AI Munim-style: pick a
-- ledger collection, generate a numbered GST invoice)
-- Migration 0008 (additive, safe to re-run — IF NOT EXISTS / duplicate_object)
--
-- Design:
--  - clinics gets billing fields (gstin/state/pincode) used as the "seller"
--    details on every invoice printed for that clinic.
--  - patients gets an optional gstin/state so B2B patients (e.g. a corporate
--    booking) can carry their own GSTIN; state also drives CGST+SGST vs IGST.
--  - clinic_invoices is the invoice header (one per generated invoice, with
--    its own per-clinic sequential invoice_number). clinic_invoice_items
--    holds line items (service name, qty, rate, gst rate).
--  - Healthcare consultation is GST-exempt in India by default, so gst_rate
--    on a line item defaults to 0 — a clinic only sets a rate on lines that
--    are actually taxable (e.g. non-medical products, cosmetic procedures).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS invoice_prefix TEXT NOT NULL DEFAULT 'INV';

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('issued', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS clinic_invoices (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  invoice_number      TEXT NOT NULL,      -- e.g. "INV-2026-0001", unique per clinic
  invoice_date        DATE NOT NULL DEFAULT CURRENT_DATE,

  patient_id          UUID REFERENCES patients(id) ON DELETE SET NULL,
  ledger_entry_id      UUID REFERENCES clinic_ledger_entries(id) ON DELETE SET NULL,

  -- Snapshot of the seller (clinic) and buyer (patient) details at the time
  -- of issue, so a later edit to the clinic/patient record never changes a
  -- previously-issued invoice.
  seller_snapshot     JSONB NOT NULL,     -- { name, address, city, state, pincode, gstin, phone, email }
  buyer_snapshot      JSONB NOT NULL,     -- { name, address, state, gstin, phone }

  subtotal_paise      INTEGER NOT NULL DEFAULT 0,
  cgst_paise          INTEGER NOT NULL DEFAULT 0,
  sgst_paise          INTEGER NOT NULL DEFAULT 0,
  igst_paise          INTEGER NOT NULL DEFAULT 0,
  total_paise         INTEGER NOT NULL DEFAULT 0,
  is_interstate       BOOLEAN NOT NULL DEFAULT false,

  notes               TEXT,
  status              invoice_status NOT NULL DEFAULT 'issued',

  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (clinic_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS clinic_invoice_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id          UUID NOT NULL REFERENCES clinic_invoices(id) ON DELETE CASCADE,

  description         TEXT NOT NULL,
  quantity            NUMERIC(10, 2) NOT NULL DEFAULT 1,
  rate_paise          INTEGER NOT NULL,
  gst_rate_percent    NUMERIC(5, 2) NOT NULL DEFAULT 0,   -- 0 = GST-exempt (default for consultations)
  amount_paise        INTEGER NOT NULL,                    -- quantity * rate_paise, pre-tax
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_clinic_invoices_clinic_date
  ON clinic_invoices (clinic_id, invoice_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinic_invoices_patient
  ON clinic_invoices (patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clinic_invoice_items_invoice
  ON clinic_invoice_items (invoice_id);

DO $$ BEGIN
  CREATE TRIGGER trg_clinic_invoices_updated_at
    BEFORE UPDATE ON clinic_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
