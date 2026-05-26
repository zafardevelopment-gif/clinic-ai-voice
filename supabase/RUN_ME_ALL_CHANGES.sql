-- ═══════════════════════════════════════════════════════════════════════════
-- ClinicPing — All Database Changes (Single Execution File)
--
-- INSTRUCTIONS:
--   1. Open Supabase Dashboard → your project → SQL Editor → "+ New query"
--   2. Copy-paste THIS ENTIRE FILE
--   3. Click "Run" (or Ctrl+Enter)
--   4. Wait for "Success. No rows returned" — that's it.
--
-- This file is IDEMPOTENT — safe to run multiple times. It will not
-- duplicate enums, tables, or seed rows.
--
-- What it adds:
--   1. reminder_type / reminder_status / reminder_response enums
--   2. subscription_plan / subscription_status_t enums
--   3. reminder_settings           (per-clinic on/off + call window + templates)
--   4. appointment_reminders       (every reminder call we plan or place)
--   5. clinic_subscriptions        (Razorpay-ready, with per-clinic feature overrides)
--   6. subscription_plans          (admin-editable plan definitions, pre-seeded)
--   7. subscription_audit_log      (who changed what & when)
--   8. clinic_has_feature(...)     (SQL function for effective feature resolution)
--   9. Seeds every existing clinic with a 14-day trial + default reminder settings
--
-- EXISTING TABLES (clinics, patients, appointments, etc.) are NOT modified.
-- Only ADDITIONS.
--
-- To rollback, run: scripts/rollback_all_changes.sql
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 1: ENUMS
-- ───────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM (
    'appointment_24h',
    'appointment_2h',
    'post_visit',
    'birthday',
    'annual_checkup',
    'broadcast'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM (
    'scheduled',
    'in_progress',
    'answered',
    'no_answer',
    'busy',
    'failed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_response AS ENUM (
    'confirmed',
    'reschedule',
    'cancel',
    'hung_up',
    'no_response'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM (
    'trial', 'basic', 'pro', 'premium'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status_t AS ENUM (
    'trialing', 'active', 'past_due', 'cancelled', 'paused'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 2: REMINDER SETTINGS (per clinic on/off + call window + templates)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminder_settings (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id                   UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,

  -- Master switch + per-type toggles
  is_enabled                  BOOLEAN NOT NULL DEFAULT true,
  appointment_24h_enabled     BOOLEAN NOT NULL DEFAULT true,
  appointment_2h_enabled      BOOLEAN NOT NULL DEFAULT true,
  post_visit_enabled          BOOLEAN NOT NULL DEFAULT false,
  birthday_enabled            BOOLEAN NOT NULL DEFAULT false,
  annual_checkup_enabled      BOOLEAN NOT NULL DEFAULT false,
  broadcast_enabled           BOOLEAN NOT NULL DEFAULT false,

  -- TRAI-friendly call window. Calls outside this window are deferred.
  call_window_start           TIME NOT NULL DEFAULT '10:00',
  call_window_end             TIME NOT NULL DEFAULT '19:00',
  -- Days of week we may call (0=Sun … 6=Sat).
  call_days                   SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],

  -- Spoken language + provider-specific voice for TTS
  language                    TEXT NOT NULL DEFAULT 'hi-IN',
  voice_id                    TEXT,

  -- Optional custom templates per reminder type. Supports placeholders:
  --   {patient_name} {doctor_name} {date} {time} {clinic_name}
  template_appointment_24h    TEXT,
  template_appointment_2h     TEXT,
  template_post_visit         TEXT,
  template_birthday           TEXT,

  -- Retry policy if call doesn't connect first try
  max_retries                 SMALLINT NOT NULL DEFAULT 2 CHECK (max_retries BETWEEN 0 AND 5),
  retry_gap_minutes           INTEGER NOT NULL DEFAULT 30 CHECK (retry_gap_minutes >= 5),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 3: APPOINTMENT REMINDERS (one row per planned reminder call)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointment_reminders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- For appointment-tied reminders. NULL for birthday/broadcast.
  appointment_id      UUID REFERENCES appointments(id) ON DELETE CASCADE,
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  type                reminder_type NOT NULL,
  status              reminder_status NOT NULL DEFAULT 'scheduled',
  response            reminder_response,

  -- When the cron should attempt to place the call (UTC).
  scheduled_at        TIMESTAMPTZ NOT NULL,
  placed_at           TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,

  -- Snapshot of dialed number + clinic outbound caller ID
  to_number           TEXT NOT NULL,
  from_number         TEXT,

  -- Carrier-side call ID (Twilio CallSid / Exotel CallSid)
  provider_call_sid   TEXT UNIQUE,
  provider            TEXT NOT NULL DEFAULT 'twilio',

  -- The actual spoken text (audit/replay)
  spoken_script       TEXT,
  duration_seconds    INTEGER,
  -- DTMF digits pressed (raw, e.g. '1' or '12#')
  dtmf_received       TEXT,

  attempt             SMALLINT NOT NULL DEFAULT 1,
  cost_paise          INTEGER,
  error_message       TEXT,
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_appt_type UNIQUE (appointment_id, type)
);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 4: CLINIC SUBSCRIPTIONS (Razorpay-ready state)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id                   UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  plan                        subscription_plan NOT NULL DEFAULT 'trial',
  status                      subscription_status_t NOT NULL DEFAULT 'trialing',

  razorpay_customer_id        TEXT,
  razorpay_subscription_id    TEXT UNIQUE,

  monthly_call_limit          INTEGER,
  calls_used_this_cycle       INTEGER NOT NULL DEFAULT 0,

  trial_ends_at               TIMESTAMPTZ,
  current_period_start        TIMESTAMPTZ,
  current_period_end          TIMESTAMPTZ,
  cancel_at_period_end        BOOLEAN NOT NULL DEFAULT false,

  -- Per-clinic feature overrides set by Super Admin.
  -- Example: { "broadcast": true, "birthday": false }
  -- A key here OVERRIDES the plan default for this single clinic.
  feature_overrides           JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 5: SUBSCRIPTION PLANS (admin-editable, no code deploy needed)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_plans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_code             subscription_plan NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  description           TEXT,
  monthly_price_inr     INTEGER NOT NULL,
  annual_price_inr      INTEGER,
  monthly_call_limit    INTEGER,
  features              JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 6: SUBSCRIPTION AUDIT LOG
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  -- 'plan_changed' | 'feature_granted' | 'feature_revoked' | 'limit_changed'
  action          TEXT NOT NULL,
  old_value       JSONB,
  new_value       JSONB,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 7: INDEXES
-- ───────────────────────────────────────────────────────────────────────────

-- Scheduler hot path: "find reminders due in the next N minutes"
CREATE INDEX IF NOT EXISTS idx_reminders_due
  ON appointment_reminders (scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_reminders_clinic_status
  ON appointment_reminders (clinic_id, status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminders_patient
  ON appointment_reminders (patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminders_provider_sid
  ON appointment_reminders (provider_call_sid)
  WHERE provider_call_sid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_clinic
  ON clinic_subscriptions (clinic_id);

CREATE INDEX IF NOT EXISTS idx_sub_audit_clinic
  ON subscription_audit_log (clinic_id, created_at DESC);


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 8: TRIGGERS (auto-update updated_at)
-- ───────────────────────────────────────────────────────────────────────────
-- update_updated_at() function already exists from the original schema.sql.

DO $$ BEGIN
  CREATE TRIGGER trg_reminder_settings_updated_at
    BEFORE UPDATE ON reminder_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_appointment_reminders_updated_at
    BEFORE UPDATE ON appointment_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_clinic_subscriptions_updated_at
    BEFORE UPDATE ON clinic_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 9: SEED DEFAULT PLANS
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO subscription_plans
  (plan_code, display_name, description, monthly_price_inr, annual_price_inr, monthly_call_limit, features, sort_order)
VALUES
  ('trial',   'Free Trial', '14 days free, 100 calls included', 0,    NULL,  100,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":false,"birthday":false,"annual_checkup":false,"broadcast":false,"custom_voice":false,"pdf_report":false}'::jsonb, 0),
  ('basic',   'Basic',      'Solo doctor just starting',        799,  7999,  100,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":false,"birthday":false,"annual_checkup":false,"broadcast":false,"custom_voice":false,"pdf_report":false}'::jsonb, 1),
  ('pro',     'Pro',        'Active clinic, 10-30 patients/day',1499, 14999, 500,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":true,"birthday":true,"annual_checkup":false,"broadcast":false,"custom_voice":false,"pdf_report":true}'::jsonb, 2),
  ('premium', 'Premium',    'Nursing home / specialist clinic', 2999, 29999, NULL,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":true,"birthday":true,"annual_checkup":true,"broadcast":true,"custom_voice":true,"pdf_report":true}'::jsonb, 3)
ON CONFLICT (plan_code) DO NOTHING;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 10: SEED EXISTING CLINICS
-- ───────────────────────────────────────────────────────────────────────────

-- Give every existing clinic a default reminder_settings row
INSERT INTO reminder_settings (clinic_id)
SELECT id FROM clinics
ON CONFLICT (clinic_id) DO NOTHING;

-- Give every existing clinic a 14-day trial subscription
INSERT INTO clinic_subscriptions (clinic_id, plan, status, trial_ends_at, monthly_call_limit)
SELECT id, 'trial', 'trialing', NOW() + INTERVAL '14 days', 100
FROM clinics
ON CONFLICT (clinic_id) DO NOTHING;


-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 11: FEATURE RESOLUTION FUNCTION
-- ───────────────────────────────────────────────────────────────────────────
-- Returns the EFFECTIVE on/off state for a feature, applying priority:
--   clinic toggle > super-admin override > plan default
--
-- Use from app code OR raw SQL:
--   SELECT clinic_has_feature('<clinic-uuid>', 'birthday');

CREATE OR REPLACE FUNCTION clinic_has_feature(
  p_clinic_id UUID,
  p_feature   TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_plan_feature  BOOLEAN;
  v_override      JSONB;
  v_settings_col  TEXT;
  v_clinic_toggle BOOLEAN;
BEGIN
  -- 1. Plan default
  SELECT (sp.features ->> p_feature)::boolean
    INTO v_plan_feature
    FROM clinic_subscriptions cs
    JOIN subscription_plans sp ON sp.plan_code = cs.plan
   WHERE cs.clinic_id = p_clinic_id;

  IF v_plan_feature IS NULL THEN
    v_plan_feature := false;
  END IF;

  -- 2. Super-admin per-clinic override
  SELECT feature_overrides INTO v_override
    FROM clinic_subscriptions WHERE clinic_id = p_clinic_id;

  IF v_override ? p_feature THEN
    v_plan_feature := (v_override ->> p_feature)::boolean;
  END IF;

  IF NOT v_plan_feature THEN
    RETURN false;
  END IF;

  -- 3. Clinic-admin toggle (if mapped to a column)
  v_settings_col := CASE p_feature
    WHEN 'appointment_24h' THEN 'appointment_24h_enabled'
    WHEN 'appointment_2h'  THEN 'appointment_2h_enabled'
    WHEN 'post_visit'      THEN 'post_visit_enabled'
    WHEN 'birthday'        THEN 'birthday_enabled'
    WHEN 'annual_checkup'  THEN 'annual_checkup_enabled'
    WHEN 'broadcast'       THEN 'broadcast_enabled'
    ELSE NULL
  END;

  IF v_settings_col IS NULL THEN
    RETURN true;
  END IF;

  EXECUTE format('SELECT %I FROM reminder_settings WHERE clinic_id = $1', v_settings_col)
    INTO v_clinic_toggle USING p_clinic_id;

  RETURN COALESCE(v_clinic_toggle, true);
END;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- DONE. Verify with these queries:
--
--   SELECT COUNT(*) FROM subscription_plans;          -- should be >= 4
--   SELECT COUNT(*) FROM clinic_subscriptions;        -- = number of clinics
--   SELECT COUNT(*) FROM reminder_settings;           -- = number of clinics
--   SELECT clinic_has_feature(
--     (SELECT id FROM clinics LIMIT 1), 'appointment_24h'
--   );  -- should return true
-- ───────────────────────────────────────────────────────────────────────────
