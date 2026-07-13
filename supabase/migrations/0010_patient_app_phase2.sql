-- ═══════════════════════════════════════════════════════════════════════════
-- Patient Mobile App — Phase 2 (OCR prescription capture, patient-owned lab
-- reports, Care Navigator, family accounts + missed-dose alerts)
-- Migration 0010 (additive, safe to re-run — IF NOT EXISTS / duplicate_object)
--
-- Design:
--  - lab_reports.clinic_id becomes nullable, mirroring what 0009 did for
--    patients.clinic_id — an independent patient uploading their own report
--    has no clinic. `uploaded_by_patient_id` is added so a report can be
--    patient-owned directly, independent of any clinic/staff involvement.
--    Clinic-scoped queries (`.eq('clinic_id', clinicId)`) stay correct
--    unchanged: NULL never matches, so patient-uploaded reports with no
--    clinic stay invisible to clinic staff by construction.
--  - No new OCR-specific table: an OCR-extracted draft is ephemeral (LLM
--    response held in memory, returned to the client for confirm/edit) and
--    only becomes a `patient_medicines` row on POST /api/patient/medicines
--    with source='ocr' — that column already exists from migration 0009.
--  - care_navigator_flags is new: concerning-signal detections (red-flag
--    text, critical lab markers, repeated missed doses) surfaced to the
--    patient with a suggested next step. Deliberately NOT reusing
--    `adherence_alerts` (that table requires clinic_id + follow_up_plan_id
--    NOT NULL — it's structurally clinic-plan-scoped and doesn't fit an
--    independent patient with no clinic and no plan).
--  - family_contacts (from 0009) gains nothing structurally here; this
--    migration adds the alert log (`family_alerts`) so a missed-dose push
--    to a family member is recorded/dedupable, mirroring how
--    adherence_alerts dedupes by "open alert of same type" in the clinic
--    adherence-response route.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── lab_reports: nullable clinic_id for patient-owned uploads ──────────────
-- patient_id stays NOT NULL — every report belongs to exactly one patient,
-- whether clinic-entered or self-uploaded. Only clinic_id (the "which
-- clinic handled this" link) becomes optional.
ALTER TABLE lab_reports
  ALTER COLUMN clinic_id DROP NOT NULL;

ALTER TABLE lab_reports
  ADD COLUMN IF NOT EXISTS uploaded_by_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lab_reports_uploaded_by_patient
  ON lab_reports (uploaded_by_patient_id) WHERE uploaded_by_patient_id IS NOT NULL;

-- ─── care_navigator_flags: concerning-signal detections + suggested action ──
DO $$ BEGIN
  CREATE TYPE care_navigator_source AS ENUM ('symptom_text', 'lab_marker', 'missed_doses');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE care_navigator_status AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS care_navigator_flags (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  source            care_navigator_source NOT NULL,
  severity          TEXT NOT NULL CHECK (severity IN ('emergency', 'urgent', 'routine')),
  summary           TEXT NOT NULL,
  suggested_action  TEXT NOT NULL,   -- free text, e.g. "Consult a doctor within 24 hours"
  red_flags         TEXT[] NOT NULL DEFAULT '{}',

  -- Loose pointers, not FKs — the triggering record's table varies by
  -- source (patient_medicine_doses, lab_report_markers, ad-hoc symptom
  -- check text with no stored row at all).
  related_lab_report_id  UUID REFERENCES lab_reports(id) ON DELETE SET NULL,

  status            care_navigator_status NOT NULL DEFAULT 'open',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_care_navigator_flags_patient_open
  ON care_navigator_flags (patient_id, created_at DESC) WHERE status = 'open';

-- ─── family_alerts: log of missed-dose pushes sent to a family contact ─────
CREATE TABLE IF NOT EXISTS family_alerts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_contact_id   UUID NOT NULL REFERENCES family_contacts(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_medicine_id UUID REFERENCES patient_medicines(id) ON DELETE SET NULL,

  alert_type          TEXT NOT NULL DEFAULT 'repeated_missed_dose'
                         CHECK (alert_type IN ('repeated_missed_dose')),
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  push_ok             BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_family_alerts_contact_recent
  ON family_alerts (family_contact_id, sent_at DESC);
