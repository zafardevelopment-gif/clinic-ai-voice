-- ============================================================
-- Supabase Storage Setup for Clinic Media Uploads
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create the storage bucket (public = files are publicly readable)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinic-media',
  'clinic-media',
  true,
  20971520,  -- 20MB limit
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public read access (anyone can view uploaded files)
DROP POLICY IF EXISTS "clinic-media public read" ON storage.objects;
CREATE POLICY "clinic-media public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'clinic-media');

-- 3. Allow authenticated service role to upload
DROP POLICY IF EXISTS "clinic-media service upload" ON storage.objects;
CREATE POLICY "clinic-media service upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'clinic-media');

-- 4. Allow service role to delete
DROP POLICY IF EXISTS "clinic-media service delete" ON storage.objects;
CREATE POLICY "clinic-media service delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'clinic-media');
