-- ═══════════════════════════════════════════════════════════════════════════
-- Custom Domains — per-clinic domain on their own public website
-- Migration 0007 (additive, safe to re-run — IF NOT EXISTS)
--
-- Note: earlier draft migrations (supabase/clinic_website_migration.sql)
-- proposed a `slug`/`custom_domain`/`theme_color` set of columns that was
-- NEVER applied to the live database — the live schema only has
-- website_slug/website_enabled/website_url (from supabase_website_migration.sql,
-- the one that actually ran; confirmed against src/types/database.ts, the
-- hand-maintained authoritative reflection of the live schema). This
-- migration adds ONLY the new custom_domain columns on top of that real
-- baseline — it does not touch website_slug.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE domain_status AS ENUM (
    'unset',       -- no custom domain configured
    'pending',     -- registered with Vercel, waiting on DNS/SSL verification
    'verified',    -- DNS verified, SSL issued, domain is live
    'error'        -- Vercel reported a misconfiguration (bad DNS, etc.)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS domain_status domain_status NOT NULL DEFAULT 'unset',
  ADD COLUMN IF NOT EXISTS domain_verification JSONB,  -- Vercel's verification challenge records, if any
  ADD COLUMN IF NOT EXISTS domain_added_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS domain_checked_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS clinics_custom_domain_unique
  ON clinics (custom_domain) WHERE custom_domain IS NOT NULL;
