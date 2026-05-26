-- ═══════════════════════════════════════════════════════════════════════════
-- ClinicPing — Outbound Reminder Calls
-- Migration 0002 (additive, safe to re-run with IF NOT EXISTS)
--
-- What this adds:
--   - reminder_type enum  : appointment / post_visit / birthday / broadcast
--   - reminder_status enum: scheduled / in_progress / answered / no_answer /
--                            failed / cancelled
--   - reminder_response enum: confirmed / reschedule / cancel / no_response
--   - appointment_reminders : every reminder call we plan or place
--   - reminder_settings     : per-clinic on/off + timing + script template
--   - subscription_plan enum + clinic_subscriptions table (Razorpay-ready)
--   - indexes + updated_at triggers
--
-- Existing tables (clinics, patients, appointments, doctors, calls) are NOT
-- modified. Read-only for this migration.
--
-- To rollback, run: see scripts/rollback_0002_clinicping_reminders.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ENUMS ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE reminder_type AS ENUM (
    'appointment_24h',     -- 24 hours before appointment
    'appointment_2h',      -- 2 hours before appointment
    'post_visit',          -- 3 days after visit
    'birthday',            -- on patient's DOB
    'annual_checkup',      -- 1 year since last visit
    'broadcast'            -- custom one-off to all patients
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_status AS ENUM (
    'scheduled',           -- queued, will be placed at scheduled_at
    'in_progress',         -- call placed, waiting for completion
    'answered',            -- patient picked up
    'no_answer',           -- ring out without answer
    'busy',                -- line busy
    'failed',              -- carrier rejected / number invalid
    'cancelled'            -- cancelled before placement (e.g. appt cancelled)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE reminder_response AS ENUM (
    'confirmed',           -- DTMF 1 — confirms attendance / acknowledges
    'reschedule',          -- DTMF 2 — wants to reschedule
    'cancel',              -- DTMF 3 — wants to cancel
    'hung_up',             -- patient hung up mid-message
    'no_response'          -- pickup but no DTMF before timeout
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

-- ── REMINDER SETTINGS (per clinic) ───────────────────────────────────────────
-- One row per clinic. Controls whether reminders are sent at all, what times,
-- and the script template the LLM uses to generate the spoken message.
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

  -- TRAI-friendly call window. Calls placed outside this window are deferred.
  call_window_start           TIME NOT NULL DEFAULT '10:00',
  call_window_end             TIME NOT NULL DEFAULT '19:00',
  -- Days of week we may call (0=Sun … 6=Sat). Empty array = no calls.
  call_days                   SMALLINT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6],

  -- Spoken language for the reminder TTS. Falls back to clinic locale.
  language                    TEXT NOT NULL DEFAULT 'hi-IN',
  voice_id                    TEXT,           -- provider-specific voice (e.g. Sarvam 'meera')

  -- Optional custom template per type. NULL = use LLM-generated default.
  -- Supports placeholders: {patient_name} {doctor_name} {date} {time} {clinic_name}
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

-- ── APPOINTMENT_REMINDERS (one row per planned reminder call) ────────────────
CREATE TABLE IF NOT EXISTS appointment_reminders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id           UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- For appointment-tied reminders. NULL for birthday/broadcast.
  appointment_id      UUID REFERENCES appointments(id) ON DELETE CASCADE,
  -- Always set; we still need to know whom we called.
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

  type                reminder_type NOT NULL,
  status              reminder_status NOT NULL DEFAULT 'scheduled',
  response            reminder_response,

  -- When the cron should attempt to place the call (UTC).
  scheduled_at        TIMESTAMPTZ NOT NULL,
  -- When the call actually went out and ended.
  placed_at           TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,

  -- Number we dialed (snapshot — patient may change phone later).
  to_number           TEXT NOT NULL,
  -- The clinic's outbound caller ID at time of call.
  from_number         TEXT,

  -- Carrier-side call ID (Twilio CallSid / Exotel CallSid). Used to attribute
  -- status-callback webhooks back to this reminder.
  provider_call_sid   TEXT UNIQUE,
  provider            TEXT NOT NULL DEFAULT 'twilio',

  -- The actual spoken text. Saved so we can audit / replay.
  spoken_script       TEXT,
  -- Duration in seconds reported by carrier.
  duration_seconds    INTEGER,
  -- DTMF digits pressed (raw, e.g. '1' or '12#').
  dtmf_received       TEXT,

  -- Retry tracking. attempt=1 for first try; if no_answer/busy and
  -- attempt < max_retries, scheduler creates a new row with attempt++.
  attempt             SMALLINT NOT NULL DEFAULT 1,

  -- Cost tracking in INR paise (integer to avoid float drift).
  cost_paise          INTEGER,

  -- Error message if status=failed
  error_message       TEXT,

  -- Free-form for provider-specific extras (e.g. Twilio AnsweredBy machine
  -- detection result, Exotel recording URL).
  metadata            JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A given appointment can have multiple reminders (24h + 2h) but only
  -- ONE per type. Prevents the scheduler from double-queueing.
  CONSTRAINT uq_appt_type UNIQUE (appointment_id, type)
);

-- ── CLINIC_SUBSCRIPTIONS (Razorpay subscription state) ───────────────────────
CREATE TABLE IF NOT EXISTS clinic_subscriptions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id                   UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  plan                        subscription_plan NOT NULL DEFAULT 'trial',
  status                      subscription_status_t NOT NULL DEFAULT 'trialing',

  -- Razorpay IDs (nullable while user is in trial).
  razorpay_customer_id        TEXT,
  razorpay_subscription_id    TEXT UNIQUE,

  -- Per-cycle quota. NULL = unlimited (Premium).
  monthly_call_limit          INTEGER,
  -- Counter reset each billing cycle by the scheduler.
  calls_used_this_cycle       INTEGER NOT NULL DEFAULT 0,

  trial_ends_at               TIMESTAMPTZ,
  current_period_start        TIMESTAMPTZ,
  current_period_end          TIMESTAMPTZ,
  cancel_at_period_end        BOOLEAN NOT NULL DEFAULT false,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────
-- Scheduler hot path: "find reminders due in the next N minutes".
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

-- ── TRIGGERS ─────────────────────────────────────────────────────────────────
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

-- ── SEED: give every existing clinic a default reminder_settings row ─────────
-- (so the dashboard doesn't break for older clinics created before this migration)
INSERT INTO reminder_settings (clinic_id)
SELECT id FROM clinics
ON CONFLICT (clinic_id) DO NOTHING;

-- ── SEED: every existing clinic starts on a 14-day trial ─────────────────────
INSERT INTO clinic_subscriptions (clinic_id, plan, status, trial_ends_at, monthly_call_limit)
SELECT id, 'trial', 'trialing', NOW() + INTERVAL '14 days', 100
FROM clinics
ON CONFLICT (clinic_id) DO NOTHING;
