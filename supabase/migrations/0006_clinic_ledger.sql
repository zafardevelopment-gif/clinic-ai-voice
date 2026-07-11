-- ═══════════════════════════════════════════════════════════════════════════
-- Clinic Ledger — simple cashbook (patient collections/refunds, staff &
-- clinic expenses, other transactions)
-- Migration 0006 (additive, safe to re-run — IF NOT EXISTS / duplicate_object)
--
-- Not a full accounting system: no double-entry, no tax/GST handling, no
-- multi-currency. Just a running log clinic staff use to track money in/out,
-- with a same-day/monthly summary. Good enough for a single small clinic's
-- day-to-day cash tracking; a real accounting package is the V2 path if a
-- clinic outgrows this.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE ledger_entry_type AS ENUM (
    'patient_collection',  -- money received from a patient (+)
    'patient_refund',      -- money returned to a patient (-)
    'staff_expense',       -- salaries, staff advances, reimbursements (-)
    'clinic_expense',      -- rent, utilities, supplies, maintenance (-)
    'other'                -- anything else, sign determined by amount
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS clinic_ledger_entries (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  entry_type        ledger_entry_type NOT NULL,
  -- Always stored as a positive magnitude; entry_type determines the sign
  -- when computing summaries (collection = +, refund/expense = -, other =
  -- caller-supplied sign via is_credit).
  amount_paise      INTEGER NOT NULL CHECK (amount_paise > 0),
  is_credit         BOOLEAN NOT NULL DEFAULT true,  -- true = money in, false = money out

  -- Optional links — patient collection/refund often ties back to a visit.
  appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id        UUID REFERENCES patients(id) ON DELETE SET NULL,
  -- For a refund entry, point back at the original collection entry.
  related_entry_id  UUID REFERENCES clinic_ledger_entries(id) ON DELETE SET NULL,

  payment_method    TEXT CHECK (payment_method IN ('cash', 'card', 'upi', 'bank_transfer', 'other')),
  note              TEXT,
  entry_date        DATE NOT NULL DEFAULT CURRENT_DATE,

  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_clinic_date
  ON clinic_ledger_entries (clinic_id, entry_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_clinic_type
  ON clinic_ledger_entries (clinic_id, entry_type, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_appointment
  ON clinic_ledger_entries (appointment_id) WHERE appointment_id IS NOT NULL;

DO $$ BEGIN
  CREATE TRIGGER trg_clinic_ledger_entries_updated_at
    BEFORE UPDATE ON clinic_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
