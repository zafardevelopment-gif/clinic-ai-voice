-- ============================================================
-- Migration 0004: Clinic Onboarding Modes
-- Adds support for 3 different ways a clinic can integrate:
--   1. forwarding     — Clinic forwards its existing line to a shared platform Twilio number
--   2. llp_dedicated  — Platform (your LLP) buys a dedicated Twilio number per clinic
--   3. own_kyc        — Clinic buys its own Twilio number under its own KYC
-- ============================================================

-- Onboarding mode enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clinic_onboarding_mode') THEN
    CREATE TYPE public.clinic_onboarding_mode AS ENUM (
      'forwarding',
      'llp_dedicated',
      'own_kyc'
    );
  END IF;
END$$;

-- Number ownership enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'twilio_number_owner') THEN
    CREATE TYPE public.twilio_number_owner AS ENUM (
      'platform',
      'clinic'
    );
  END IF;
END$$;

-- New columns on clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS onboarding_mode public.clinic_onboarding_mode NOT NULL DEFAULT 'forwarding';

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS forwarded_from_number text;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS twilio_number text;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS twilio_number_owner public.twilio_number_owner;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS twilio_number_sid text;

-- Indexes for fast routing lookups in /api/voice/incoming-call
CREATE INDEX IF NOT EXISTS idx_clinics_forwarded_from_number
  ON public.clinics(forwarded_from_number)
  WHERE forwarded_from_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clinics_twilio_number
  ON public.clinics(twilio_number)
  WHERE twilio_number IS NOT NULL;

-- Backfill: any existing clinic with a phone set is treated as llp_dedicated
-- so the current /api/voice/incoming-call lookup (eq.phone) keeps working
-- until you re-onboard those clinics.
UPDATE public.clinics
SET
  onboarding_mode      = 'llp_dedicated',
  twilio_number        = phone,
  twilio_number_owner  = 'platform'
WHERE phone IS NOT NULL
  AND twilio_number IS NULL;
