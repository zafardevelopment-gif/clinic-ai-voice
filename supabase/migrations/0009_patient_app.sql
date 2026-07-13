-- ═══════════════════════════════════════════════════════════════════════════
-- Patient Mobile App — Phase 1 (self-serve patient accounts, disease setup,
-- manual medicine entry, push-based reminders, adherence check-in)
-- Migration 0009 (additive, safe to re-run — IF NOT EXISTS / duplicate_object)
--
-- Design:
--  - patients.clinic_id becomes nullable so a patient can self-register
--    without ever being tied to a clinic ("independent" patient). Existing
--    clinic-scoped queries (`.eq('clinic_id', clinicId)`) are unaffected:
--    Postgres NULL never equals a filter value, so independent patients are
--    invisible to clinic staff by construction — no new visibility gap.
--  - Auth fields (email/password_hash) live directly on `patients` rather
--    than a separate table, mirroring how `users` (clinic staff) does it.
--    A patient row can now be either clinic-created (no login, staff manage
--    them — email/password_hash stay NULL) or self-registered (email +
--    password_hash set, is_independent = true).
--  - patient_diseases / patient_medicines / patient_medicine_doses are new,
--    intentionally separate from the clinic's `follow_up_plans.medicines`
--    JSON blob — a patient can track/manage their own regimen independent
--    of any clinic follow-up plan. `source_follow_up_plan_id` links back to
--    a clinic plan when one exists, without requiring one.
--  - appointment_reminders.channel and adherence_logs.channel both gain
--    'push' alongside the existing voice/whatsapp/sms(/staff) options —
--    the only channel that ships without a third-party messaging provider,
--    since notify/index.ts only has a real adapter for voice today.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── patients: nullable clinic_id + self-serve auth fields ──────────────────
ALTER TABLE patients
  ALTER COLUMN clinic_id DROP NOT NULL;

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_independent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'cancelled')),
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Case-insensitive unique email, only enforced where an email is actually
-- set (clinic-created patients frequently have no email on file).
CREATE UNIQUE INDEX IF NOT EXISTS patients_email_unique
  ON patients (lower(email)) WHERE email IS NOT NULL;

-- ─── patient_diseases: self-declared chronic conditions ─────────────────────
CREATE TABLE IF NOT EXISTS patient_diseases (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  condition_name    TEXT NOT NULL,
  diagnosed_date    DATE,
  notes             TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_diseases_patient
  ON patient_diseases (patient_id) WHERE is_active;

DO $$ BEGIN
  CREATE TRIGGER trg_patient_diseases_updated_at
    BEFORE UPDATE ON patient_diseases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── patient_medicines: patient-entered regimen ──────────────────────────────
DO $$ BEGIN
  CREATE TYPE medicine_source AS ENUM ('manual', 'ocr');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS patient_medicines (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id                UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  medicine_name             TEXT NOT NULL,
  dosage                    TEXT,
  frequency                 TEXT NOT NULL,   -- e.g. "twice_daily", "once_daily" — free text in Phase 1
  duration_days             INTEGER,
  times_of_day              TEXT[] NOT NULL DEFAULT '{}',  -- e.g. '{08:00, 20:00}', drives dose schedule generation

  source                    medicine_source NOT NULL DEFAULT 'manual',
  source_follow_up_plan_id  UUID REFERENCES follow_up_plans(id) ON DELETE SET NULL,

  is_active                 BOOLEAN NOT NULL DEFAULT true,
  started_at                DATE NOT NULL DEFAULT CURRENT_DATE,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_medicines_patient
  ON patient_medicines (patient_id) WHERE is_active;

DO $$ BEGIN
  CREATE TRIGGER trg_patient_medicines_updated_at
    BEFORE UPDATE ON patient_medicines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── patient_medicine_doses: generated dose schedule + check-in log ─────────
-- Deliberately separate from `adherence_logs` (which is keyed to a clinic
-- follow_up_plan) rather than overloading that table — a dose here can
-- exist with no follow_up_plan at all.
DO $$ BEGIN
  CREATE TYPE dose_status AS ENUM ('pending', 'taken', 'missed', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS patient_medicine_doses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_medicine_id UUID NOT NULL REFERENCES patient_medicines(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  scheduled_at        TIMESTAMPTZ NOT NULL,
  status               dose_status NOT NULL DEFAULT 'pending',
  responded_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_medicine_doses_patient_pending
  ON patient_medicine_doses (patient_id, scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_patient_medicine_doses_medicine
  ON patient_medicine_doses (patient_medicine_id, scheduled_at DESC);

-- ─── family_contacts: family member is itself a lightweight patient account ─
CREATE TABLE IF NOT EXISTS family_contacts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id            UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  family_patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  relationship          TEXT,
  alert_on_missed_dose  BOOLEAN NOT NULL DEFAULT true,
  invited_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at           TIMESTAMPTZ,

  CHECK (patient_id != family_patient_id),
  UNIQUE (patient_id, family_patient_id)
);

CREATE INDEX IF NOT EXISTS idx_family_contacts_patient
  ON family_contacts (patient_id);
CREATE INDEX IF NOT EXISTS idx_family_contacts_family_patient
  ON family_contacts (family_patient_id);

-- ─── reminder/adherence channel: add 'push' alongside existing channels ─────
ALTER TABLE appointment_reminders DROP CONSTRAINT IF EXISTS appointment_reminders_channel_check;
ALTER TABLE appointment_reminders ADD CONSTRAINT appointment_reminders_channel_check
  CHECK (channel IN ('voice', 'whatsapp', 'sms', 'push'));

ALTER TABLE adherence_logs DROP CONSTRAINT IF EXISTS adherence_logs_channel_check;
ALTER TABLE adherence_logs ADD CONSTRAINT adherence_logs_channel_check
  CHECK (channel IN ('voice', 'whatsapp', 'sms', 'staff', 'push'));
