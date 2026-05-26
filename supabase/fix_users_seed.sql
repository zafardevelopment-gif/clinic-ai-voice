-- ============================================================
-- Fix Users Seed — Run in Supabase SQL Editor
-- ============================================================
-- Fixes admin user whose password_hash was stored as plain text.
-- Also adds a demo clinic + clinic_admin user.
--
-- Passwords:
--   admin@clinicai.com   → Admin@1234
--   clinic@demo.com      → Clinic@1234
-- ============================================================

-- ── 1. Fix admin password (replace plain text with bcrypt hash) ──
UPDATE public.users
SET
  password_hash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQQFLm2y',
  full_name     = 'Super Admin',
  role          = 'admin',
  is_active     = true
WHERE email = 'admin@clinicai.com';

-- If the row doesn't exist at all, insert it
INSERT INTO public.users (email, password_hash, full_name, role)
SELECT
  'admin@clinicai.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQQFLm2y',
  'Super Admin',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.users WHERE email = 'admin@clinicai.com'
);

-- ── 2. Create a demo clinic ──
INSERT INTO public.clinics (id, name, email, phone, city, country, is_active)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Demo Clinic',
  'info@democlinic.com',
  '+91 300 0000000',
  'Karachi',
  'Pakistan',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Create demo clinic_admin user ──
-- Password: Clinic@1234
INSERT INTO public.users (email, password_hash, full_name, role, clinic_id, is_active)
VALUES (
  'clinic@demo.com',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Demo Clinic Admin',
  'clinic_admin',
  'aaaaaaaa-0000-0000-0000-000000000001',
  true
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name     = EXCLUDED.full_name,
  role          = EXCLUDED.role,
  clinic_id     = EXCLUDED.clinic_id,
  is_active     = EXCLUDED.is_active;
