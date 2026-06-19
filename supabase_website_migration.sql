-- ============================================================
-- Website Feature Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add website columns to clinics table
ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS website_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS website_slug text DEFAULT NULL;

-- Ensure slug is unique
CREATE UNIQUE INDEX IF NOT EXISTS clinics_website_slug_unique ON clinics(website_slug) WHERE website_slug IS NOT NULL;

-- 2. Create clinic_website_content table
CREATE TABLE IF NOT EXISTS clinic_website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  hero_slides jsonb NOT NULL DEFAULT '[]',
  about_title text,
  about_text text,
  services jsonb NOT NULL DEFAULT '[]',
  contact_info jsonb NOT NULL DEFAULT '{}',
  seo_title text,
  seo_description text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id)
);

-- 3. Create clinic_gallery table
CREATE TYPE IF NOT EXISTS media_type AS ENUM ('image', 'video');

CREATE TABLE IF NOT EXISTS clinic_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  media_type media_type NOT NULL DEFAULT 'image',
  url text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinic_gallery_clinic_id_idx ON clinic_gallery(clinic_id);

-- 4. RLS Policies
-- clinic_website_content: clinic_admin can read/write own clinic, anyone can read if website_enabled
ALTER TABLE clinic_website_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_website_content_clinic_read" ON clinic_website_content;
CREATE POLICY "clinic_website_content_clinic_read" ON clinic_website_content
  FOR SELECT USING (true);  -- public read (checked at API level via website_enabled)

DROP POLICY IF EXISTS "clinic_website_content_service_role" ON clinic_website_content;
CREATE POLICY "clinic_website_content_service_role" ON clinic_website_content
  FOR ALL USING (true);  -- service role key bypasses RLS

-- clinic_gallery: same pattern
ALTER TABLE clinic_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clinic_gallery_select" ON clinic_gallery;
CREATE POLICY "clinic_gallery_select" ON clinic_gallery
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "clinic_gallery_service_role" ON clinic_gallery;
CREATE POLICY "clinic_gallery_service_role" ON clinic_gallery
  FOR ALL USING (true);
