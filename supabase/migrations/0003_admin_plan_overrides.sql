-- ═══════════════════════════════════════════════════════════════════════════
-- ClinicPing — Admin Plan Overrides
-- Migration 0003 (additive on top of 0002)
--
-- Adds a feature-flag matrix so:
--   1. Plans (Basic/Pro/Premium) define the DEFAULT features per tier.
--   2. clinic_subscriptions can OVERRIDE individual feature flags per clinic
--      (e.g. Super Admin grants birthday reminders to a Pro-plan clinic free
--      as a goodwill gesture).
--   3. Clinic admin can also turn ON/OFF any feature they're entitled to
--      via reminder_settings (already exists from 0002).
--
-- Priority (highest wins):
--   reminder_settings.*_enabled  (clinic admin's on/off)
--      ↓ falls back to
--   clinic_subscriptions.feature_overrides  (super admin's per-clinic grant)
--      ↓ falls back to
--   subscription_plans.features              (the plan's defaults)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── PLANS TABLE (replaces the hard-coded enum approach for the price list) ──
-- Keeps the subscription_plan enum from 0002 as a stable plan code, but now
-- the price/features for each plan code live in this table so the Super
-- Admin can edit them from the UI without code deploys.
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Matches the subscription_plan enum value. UNIQUE so each code has one row.
  plan_code             subscription_plan NOT NULL UNIQUE,
  display_name          TEXT NOT NULL,
  description           TEXT,
  monthly_price_inr     INTEGER NOT NULL,
  annual_price_inr      INTEGER,
  monthly_call_limit    INTEGER,             -- NULL = unlimited
  -- Feature matrix as JSONB so we can add new features later without ALTER TABLE.
  -- Shape: { "appointment_24h": true, "post_visit": false, ... }
  features              JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TRIGGER trg_subscription_plans_updated_at
    BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Seed default plans (Super Admin can edit/disable these later) ───────────
-- Feature keys mirror the toggles on reminder_settings + future add-ons.
INSERT INTO subscription_plans (plan_code, display_name, description, monthly_price_inr, annual_price_inr, monthly_call_limit, features, sort_order)
VALUES
  ('trial',   'Free Trial', '14 days free, 100 calls included', 0,     NULL,   100,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":false,"birthday":false,"annual_checkup":false,"broadcast":false,"custom_voice":false,"pdf_report":false}'::jsonb, 0),
  ('basic',   'Basic',      'Solo doctor just starting',         799,   7999,   100,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":false,"birthday":false,"annual_checkup":false,"broadcast":false,"custom_voice":false,"pdf_report":false}'::jsonb, 1),
  ('pro',     'Pro',        'Active clinic, 10-30 patients/day', 1499,  14999,  500,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":true,"birthday":true,"annual_checkup":false,"broadcast":false,"custom_voice":false,"pdf_report":true}'::jsonb, 2),
  ('premium', 'Premium',    'Nursing home / specialist clinic',  2999,  29999,  NULL,
   '{"appointment_24h":true,"appointment_2h":true,"post_visit":true,"birthday":true,"annual_checkup":true,"broadcast":true,"custom_voice":true,"pdf_report":true}'::jsonb, 3)
ON CONFLICT (plan_code) DO NOTHING;

-- ── PER-CLINIC FEATURE OVERRIDES ─────────────────────────────────────────────
-- Super Admin uses this to grant/revoke specific features for a single
-- clinic without changing their plan or affecting other customers.
--
-- Example: Pro-plan clinic gets "broadcast" enabled as a 1-month freebie.
--   UPDATE clinic_subscriptions
--   SET feature_overrides = jsonb_set(feature_overrides, '{broadcast}', 'true')
--   WHERE clinic_id = '...';
--
-- NULL value for a key = no override, fall back to plan default.
ALTER TABLE clinic_subscriptions
  ADD COLUMN IF NOT EXISTS feature_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Audit log so we can see who granted what & when.
CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id       UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  changed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,           -- 'plan_changed' | 'feature_granted' | 'feature_revoked' | 'limit_changed'
  old_value       JSONB,
  new_value       JSONB,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_audit_clinic ON subscription_audit_log (clinic_id, created_at DESC);

-- ── HELPER FUNCTION: resolve effective feature flag for a clinic ─────────────
-- Returns the final ON/OFF state for a given feature, applying the priority:
--   clinic toggle > super-admin override > plan default
-- Use in app code: SELECT clinic_has_feature('uuid...', 'birthday')
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
  -- Plan default
  SELECT (sp.features ->> p_feature)::boolean
    INTO v_plan_feature
    FROM clinic_subscriptions cs
    JOIN subscription_plans sp ON sp.plan_code = cs.plan
   WHERE cs.clinic_id = p_clinic_id;

  IF v_plan_feature IS NULL THEN
    v_plan_feature := false;
  END IF;

  -- Super-admin per-clinic override
  SELECT feature_overrides INTO v_override
    FROM clinic_subscriptions WHERE clinic_id = p_clinic_id;

  IF v_override ? p_feature THEN
    v_plan_feature := (v_override ->> p_feature)::boolean;
  END IF;

  -- If the feature is gated off by plan+override, stop here.
  IF NOT v_plan_feature THEN
    RETURN false;
  END IF;

  -- Finally, the clinic admin's own ON/OFF toggle (if mapped to a column).
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
    -- Feature has no clinic-admin toggle (e.g. 'custom_voice'). Plan/override is final.
    RETURN true;
  END IF;

  EXECUTE format('SELECT %I FROM reminder_settings WHERE clinic_id = $1', v_settings_col)
    INTO v_clinic_toggle USING p_clinic_id;

  RETURN COALESCE(v_clinic_toggle, true);  -- if no settings row yet, default ON
END;
$$;
