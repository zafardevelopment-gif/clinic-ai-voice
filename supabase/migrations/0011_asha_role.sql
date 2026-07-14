-- ═══════════════════════════════════════════════════════════════════════════
-- ASHA Worker role — schema only (Phase 1)
-- Migration 0011 (additive on top of 0002–0010)
--
-- Scope: this migration adds the DATA MODEL for ASHA (community health
-- worker) support only. It deliberately does NOT add auth/session handling
-- for the role — ASHA login/signup will be built later alongside the other
-- roles' auth work. Until then:
--   - 'asha' exists as a valid users.role value (so a users row COULD be
--     created for an ASHA worker later without another enum migration), but
--     no route/session code checks for it yet.
--   - asha_profiles is a standalone table, not yet linked to any auth flow.
--   - patients.created_by_asha lets a patient record be attributed to the
--     ASHA worker who registered it, once that flow exists.
--
-- Design (mirrors 0009's patients.clinic_id nullability + is_independent
-- pattern):
--   - asha_profiles.linked_clinic_id is nullable — an ASHA worker may be
--     tied to a specific clinic/program, or operate independently (e.g. a
--     govt health program not affiliated with any single clinic).
--   - patients.patient_code is the human-readable Patient ID shown to
--     independent patients (e.g. "AVX-PT-000123"). Nullable + unique where
--     set, so existing clinic-created patient rows are unaffected; backfill
--     for existing rows is a separate, deliberate follow-up (not done here
--     to avoid silently minting IDs for rows nobody will show them to).
--
-- Additive/idempotent — safe to re-run (IF NOT EXISTS / duplicate_object
-- guards throughout), matching the style of prior migrations.
--
-- To rollback, run: rollback_0011_asha_role.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ROLE ENUM ─────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'asha';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ASHA PROFILES ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asha_profiles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name         TEXT NOT NULL,
  phone             TEXT,
  region            TEXT,                -- village/block/district
  linked_clinic_id  UUID REFERENCES clinics(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asha_profiles_linked_clinic
  ON asha_profiles (linked_clinic_id) WHERE linked_clinic_id IS NOT NULL;

DO $$ BEGIN
  CREATE TRIGGER trg_asha_profiles_updated_at
    BEFORE UPDATE ON asha_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── PATIENTS: Patient ID + ASHA attribution ──────────────────────────────
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS patient_code TEXT,
  ADD COLUMN IF NOT EXISTS created_by_asha UUID REFERENCES asha_profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS patients_patient_code_unique
  ON patients (patient_code) WHERE patient_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_created_by_asha
  ON patients (created_by_asha) WHERE created_by_asha IS NOT NULL;
