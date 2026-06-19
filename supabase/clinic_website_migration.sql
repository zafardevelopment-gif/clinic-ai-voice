-- ─────────────────────────────────────────────────────────────
-- Clinic Public Website — Migration
-- Run this in your Supabase SQL editor
-- ─────────────────────────────────────────────────────────────

-- 1. Add website columns to clinics table
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS slug              TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS website_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_domain     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tagline           TEXT,
  ADD COLUMN IF NOT EXISTS theme_color       TEXT DEFAULT '#10b981',
  ADD COLUMN IF NOT EXISTS logo_url          TEXT,
  ADD COLUMN IF NOT EXISTS website_about     TEXT,
  ADD COLUMN IF NOT EXISTS website_hours     JSONB,
  ADD COLUMN IF NOT EXISTS social_facebook   TEXT,
  ADD COLUMN IF NOT EXISTS social_instagram  TEXT,
  ADD COLUMN IF NOT EXISTS social_whatsapp   TEXT;

-- 2. Auto-generate slug from clinic name for existing clinics
UPDATE clinics
SET slug = LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- 3. Make slug NOT NULL after backfill
ALTER TABLE clinics ALTER COLUMN slug SET NOT NULL;

-- 4. Public appointments table needs patient contact info
-- (already exists in appointments, just verifying columns)
-- appointment_date, appointment_time, patient_name, patient_phone, doctor_id, clinic_id, status

-- 5. Public read policy — anyone can read active clinic website data
-- (Uses service-role in API so RLS not needed, but good to have)

-- 6. Index for fast slug lookup
CREATE INDEX IF NOT EXISTS idx_clinics_slug ON clinics(slug);
CREATE INDEX IF NOT EXISTS idx_clinics_custom_domain ON clinics(custom_domain);

-- ─── Sample: enable website for first clinic (optional) ───────
-- UPDATE clinics SET website_enabled = true WHERE id = 'YOUR_CLINIC_ID';
