-- ═══════════════════════════════════════════════════════════════════════════
-- AI Clinic OS — Reminders++, Adherence, Symptom Triage, Lab Explanation
-- Migration 0005 (additive on top of 0002/0003/0004)
--
-- What this adds:
--   - user_role gains 'doctor' and 'receptionist'; users.doctor_id link
--   - reminder_type gains 'booking_confirmation' / 'medication' / 'follow_up_visit'
--   - appointment_reminders gains a channel column (voice/whatsapp/sms)
--   - reminder_events         : per-attempt delivery/response audit trail
--   - appointments gains no_show_marked_at / no_show_marked_by
--   - follow_up_plans, adherence_logs, adherence_alerts   (Module B)
--   - symptom_triage_sessions, triage_answers, triage_results (Module C)
--   - lab_reports, lab_report_markers, lab_explanations   (Module D)
--   - new subscription_plans.features keys (via UPDATE, non-destructive)
--
-- Existing tables/rows are only ever ALTERed additively (new nullable / defaulted
-- columns) — no destructive changes. Safe to re-run (IF NOT EXISTS / duplicate_object
-- guards throughout), matching the style of 0002_clinicping_reminders.sql.
--
-- To rollback, run: rollback_0005_clinic_os_modules.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ROLES ─────────────────────────────────────────────────────────────────
-- Postgres requires ALTER TYPE ... ADD VALUE to run outside a transaction
-- block in older versions; Supabase's SQL editor runs each statement
-- non-transactionally by default, so this is safe there. If running via a
-- migration runner that wraps everything in one transaction, split this
-- block out and run it first, alone.
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'doctor';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'receptionist';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;

-- ── REMINDER TYPE / CHANNEL EXTENSIONS (Module A + B reuse appointment_reminders) ──
DO $$ BEGIN
  ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'booking_confirmation';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'medication';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'follow_up_visit';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE appointment_reminders
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'voice'
    CHECK (channel IN ('voice', 'whatsapp', 'sms'));

-- Per-clinic default channel per reminder type. V1 keeps this simple (one
-- channel choice per type, applied at enqueue time) rather than a full
-- multi-channel fan-out matrix — clinics can revisit this later.
ALTER TABLE reminder_settings
  ADD COLUMN IF NOT EXISTS channel_appointment_24h TEXT NOT NULL DEFAULT 'voice' CHECK (channel_appointment_24h IN ('voice', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS channel_appointment_2h  TEXT NOT NULL DEFAULT 'voice' CHECK (channel_appointment_2h  IN ('voice', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS channel_post_visit       TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel_post_visit  IN ('voice', 'whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS channel_birthday         TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel_birthday    IN ('voice', 'whatsapp', 'sms'));

-- appointment_id is used for both single appointment reminders AND (via
-- metadata) follow-up-plan-linked medication/follow-up reminders. No schema
-- change needed there — metadata JSONB already carries follow_up_plan_id.

-- ── REMINDER_EVENTS (per-attempt audit trail: scheduled/sent/delivered/…) ───
CREATE TABLE IF NOT EXISTS reminder_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id   UUID NOT NULL REFERENCES appointment_reminders(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN
                  ('scheduled', 'sent', 'delivered', 'failed', 'opened',
                   'responded', 'cancelled')),
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_events_reminder
  ON reminder_events (reminder_id, created_at DESC);

-- ── APPOINTMENTS: explicit no-show tracking ──────────────────────────────────
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS no_show_marked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_marked_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE B — Medicine Adherence & Follow-up
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS follow_up_plans (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,

  -- [{ "name": "Amoxicillin", "dosage": "500mg", "frequency": "3x/day", "duration_days": 5 }, ...]
  medicines           JSONB NOT NULL DEFAULT '[]'::jsonb,

  reminder_frequency  TEXT NOT NULL DEFAULT 'daily'
                        CHECK (reminder_frequency IN ('daily', 'twice_daily', 'weekly')),
  follow_up_date      DATE,
  care_instructions   TEXT,
  escalation_contact  TEXT,

  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'completed', 'cancelled')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_plans_clinic
  ON follow_up_plans (clinic_id, status, follow_up_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_plans_patient
  ON follow_up_plans (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS adherence_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follow_up_plan_id   UUID NOT NULL REFERENCES follow_up_plans(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('voice', 'whatsapp', 'sms', 'staff')),
  response            TEXT NOT NULL CHECK (response IN
                        ('taken', 'missed', 'feeling_better', 'side_effects', 'call_me', 'no_response')),
  note                TEXT,
  created_via         TEXT NOT NULL DEFAULT 'patient_reply' CHECK (created_via IN ('patient_reply', 'staff_entry')),
  logged_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adherence_logs_plan
  ON adherence_logs (follow_up_plan_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS adherence_alerts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  follow_up_plan_id   UUID NOT NULL REFERENCES follow_up_plans(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  alert_type          TEXT NOT NULL CHECK (alert_type IN
                        ('repeated_missed', 'side_effects', 'callback_requested')),
  status              TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_adherence_alerts_clinic_open
  ON adherence_alerts (clinic_id, status, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER trg_follow_up_plans_updated_at
    BEFORE UPDATE ON follow_up_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE C — Symptom Triage
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS symptom_triage_sessions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id        UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id    UUID REFERENCES appointments(id) ON DELETE SET NULL,
  source            TEXT NOT NULL CHECK (source IN ('website', 'counter', 'voice_followup')),
  age_group         TEXT CHECK (age_group IN ('infant', 'child', 'adult', 'senior')),
  status            TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
  created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_sessions_clinic
  ON symptom_triage_sessions (clinic_id, created_at DESC);

CREATE TABLE IF NOT EXISTS triage_answers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id            UUID NOT NULL UNIQUE REFERENCES symptom_triage_sessions(id) ON DELETE CASCADE,
  chief_complaint       TEXT NOT NULL,
  duration              TEXT,
  fever                 BOOLEAN NOT NULL DEFAULT false,
  pain_severity         SMALLINT CHECK (pain_severity BETWEEN 0 AND 10),
  existing_conditions   TEXT[] NOT NULL DEFAULT '{}',
  current_medicines     TEXT[] NOT NULL DEFAULT '{}',
  red_flags             TEXT[] NOT NULL DEFAULT '{}',
  raw_answers           JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS triage_results (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id              UUID NOT NULL UNIQUE REFERENCES symptom_triage_sessions(id) ON DELETE CASCADE,
  category                TEXT NOT NULL CHECK (category IN
                            ('emergency', 'urgent_same_day', 'routine', 'follow_up')),
  summary                 TEXT NOT NULL,
  doctor_notes            TEXT,
  suggested_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  suggested_doctor_id     UUID REFERENCES doctors(id) ON DELETE SET NULL,
  ai_model                TEXT,
  is_ai_edited            BOOLEAN NOT NULL DEFAULT false,
  reviewed_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_results_category
  ON triage_results (category, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- MODULE D — Lab Report Explanation
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lab_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  -- V2 path: OCR/parsing will populate lab_report_markers automatically from
  -- this file. For V1, markers are entered manually and this is storage-only.
  uploaded_file_url   TEXT,
  report_date         DATE,
  lab_name            TEXT,
  entered_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'entered'
                        CHECK (status IN ('entered', 'explained', 'reviewed')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_clinic
  ON lab_reports (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_reports_patient
  ON lab_reports (patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lab_report_markers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_report_id     UUID NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
  marker_name       TEXT NOT NULL,
  value             TEXT NOT NULL,
  unit              TEXT,
  reference_range   TEXT,
  is_abnormal       BOOLEAN NOT NULL DEFAULT false,
  flag              TEXT NOT NULL DEFAULT 'normal' CHECK (flag IN ('low', 'high', 'normal', 'critical')),
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_lab_markers_report
  ON lab_report_markers (lab_report_id, sort_order);

CREATE TABLE IF NOT EXISTS lab_explanations (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_report_id               UUID NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,
  patient_summary_en          TEXT NOT NULL,
  patient_summary_hi          TEXT,
  abnormal_markers_summary    TEXT,
  doctor_discussion_points    TEXT,
  next_action_category        TEXT NOT NULL CHECK (next_action_category IN
                                ('routine_review', 'discuss_soon', 'urgent_review')),
  ai_model                    TEXT,
  is_ai_edited                BOOLEAN NOT NULL DEFAULT false,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only history: NOT unique on lab_report_id — each explain run adds
-- a new row so nothing is ever overwritten. Latest is "ORDER BY created_at DESC LIMIT 1".
CREATE INDEX IF NOT EXISTS idx_lab_explanations_report
  ON lab_explanations (lab_report_id, created_at DESC);

DO $$ BEGIN
  CREATE TRIGGER trg_lab_reports_updated_at
    BEFORE UPDATE ON lab_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE FLAGS — extend subscription_plans.features with the 3 new modules
-- ═══════════════════════════════════════════════════════════════════════════
-- Merge new keys into existing plans without clobbering current settings.
-- trial/basic: adherence+triage on (low cost, high retention value), lab
-- explanation gated to pro+ (heavier LLM usage). Premium: everything on.
UPDATE subscription_plans
SET features = features || '{"medicine_adherence": true, "symptom_triage": true, "lab_report_explain": false}'::jsonb
WHERE plan_code IN ('trial', 'basic');

UPDATE subscription_plans
SET features = features || '{"medicine_adherence": true, "symptom_triage": true, "lab_report_explain": true}'::jsonb
WHERE plan_code IN ('pro', 'premium');
