-- ═══════════════════════════════════════════════════════════════════════════
-- Prescription Digitization & Visual/Video Analysis (spec §6B) — schema
-- Migration 0013 (additive on top of 0002–0012)
--
-- What this adds:
--   - patient_media: stores uploaded prescription photos and
--     condition photo/video captures (from either the Doctor Co-Pilot
--     screen or a patient/ASHA pre-visit upload), plus the AI's neutral
--     extraction/description and a mandatory doctor-confirmation flag.
--   - Links optionally to a symptom_triage_sessions row (a Co-Pilot session,
--     or a patient-intake triage session) via triage_session_id — nullable,
--     since a patient/ASHA might attach a photo before any session exists
--     yet.
--
-- Regulatory note (carried from the spec): a misread drug name from OCR is
-- a safety risk, so doctor_confirmed defaults false and nothing here is
-- ever treated as authoritative medication history until a doctor
-- confirms it (see /api/clinic/copilot/[id]/media/[mediaId]/confirm).
-- Condition photo/video analysis is descriptive-only by default;
-- differential-leaning output is only ever generated when a doctor
-- explicitly requests it (see src/lib/ai/visual-analysis.ts) and is never
-- shown to a patient directly, regardless of who uploaded the media.
--
-- Additive/idempotent — safe to re-run (IF NOT EXISTS / duplicate_object
-- guards throughout), matching the style of prior migrations.
--
-- To rollback, run: rollback_0013_patient_media.sql
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE patient_media_type AS ENUM ('prescription_photo', 'condition_photo', 'condition_video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE patient_media_uploader AS ENUM ('doctor', 'patient', 'asha');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS patient_media (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID REFERENCES clinics(id) ON DELETE SET NULL,
  patient_id          UUID REFERENCES patients(id) ON DELETE CASCADE,
  triage_session_id   UUID REFERENCES symptom_triage_sessions(id) ON DELETE SET NULL,

  uploaded_by         patient_media_uploader NOT NULL,
  uploaded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,       -- set when uploaded_by = 'doctor'
  uploaded_by_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL, -- set when uploaded_by = 'patient' (self-upload)

  media_type          patient_media_type NOT NULL,
  file_url            TEXT NOT NULL,

  ai_extracted_data    JSONB,   -- prescription: { doctor_name, date, medicines: [...] }; visual: { description, differential_considerations, confidence_note }
  ai_model             TEXT,
  doctor_confirmed      BOOLEAN NOT NULL DEFAULT false,
  confirmed_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  confirmed_at           TIMESTAMPTZ,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_media_patient
  ON patient_media (patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_media_triage_session
  ON patient_media (triage_session_id) WHERE triage_session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patient_media_clinic
  ON patient_media (clinic_id, created_at DESC) WHERE clinic_id IS NOT NULL;
