-- ============================================================
-- Custom Users Table (replaces Supabase Auth)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop old auth-dependent tables/triggers if you previously ran schema.sql
-- (skip these drops if running fresh)
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.calls CASCADE;
DROP TABLE IF EXISTS public.voice_agent_config CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.doctor_availability CASCADE;
DROP TABLE IF EXISTS public.doctors CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.clinics CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.call_type CASCADE;
DROP TYPE IF EXISTS public.call_outcome CASCADE;
DROP TYPE IF EXISTS public.appointment_status CASCADE;
DROP TYPE IF EXISTS public.speaker_type CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.user_role        AS ENUM ('admin', 'clinic_admin');
CREATE TYPE public.call_type        AS ENUM ('booking', 'query', 'followup');
CREATE TYPE public.call_outcome     AS ENUM ('booked', 'not_booked', 'callback', 'transferred');
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE public.speaker_type     AS ENUM ('user', 'ai');

-- ============================================================
-- CLINICS
-- ============================================================
CREATE TABLE public.clinics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  email         text,
  phone         text,
  address       text,
  city          text,
  country       text DEFAULT 'Pakistan',
  logo_url      text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- USERS (custom — no Supabase Auth)
-- ============================================================
CREATE TABLE public.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text,
  role          public.user_role NOT NULL DEFAULT 'clinic_admin',
  clinic_id     uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  is_active     boolean NOT NULL DEFAULT true,
  last_login    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email     ON public.users(email);
CREATE INDEX idx_users_clinic_id ON public.users(clinic_id);

-- ============================================================
-- DEPARTMENTS
-- ============================================================
CREATE TABLE public.departments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id  uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name       text NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DOCTORS
-- ============================================================
CREATE TABLE public.doctors (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id             uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  department_id         uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  full_name             text NOT NULL,
  specialization        text,
  phone                 text,
  email                 text,
  bio                   text,
  avatar_url            text,
  is_active             boolean NOT NULL DEFAULT true,
  slot_duration_minutes int NOT NULL DEFAULT 30,
  booking_min_hours     int NOT NULL DEFAULT 2,
  booking_max_days      int NOT NULL DEFAULT 30,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctors_clinic_id ON public.doctors(clinic_id);

-- ============================================================
-- DOCTOR AVAILABILITY
-- ============================================================
CREATE TABLE public.doctor_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  day_of_week  int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time   time NOT NULL DEFAULT '09:00',
  end_time     time NOT NULL DEFAULT '17:00',
  is_available boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, day_of_week)
);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE public.patients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  phone       text,
  email       text,
  date_of_birth date,
  gender      text CHECK (gender IN ('male','female','other')),
  address     text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_clinic_id ON public.patients(clinic_id);
CREATE INDEX idx_patients_phone     ON public.patients(phone);

-- ============================================================
-- APPOINTMENTS
-- ============================================================
CREATE TABLE public.appointments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id         uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id        uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id         uuid NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date  date NOT NULL,
  appointment_time  time NOT NULL,
  duration_minutes  int NOT NULL DEFAULT 30,
  status            public.appointment_status NOT NULL DEFAULT 'scheduled',
  reason            text,
  notes             text,
  booked_via        text DEFAULT 'manual',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_clinic_id        ON public.appointments(clinic_id);
CREATE INDEX idx_appointments_doctor_id        ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_appointment_date ON public.appointments(appointment_date);

-- ============================================================
-- VOICE AGENT CONFIG
-- ============================================================
CREATE TABLE public.voice_agent_config (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id                uuid NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
  is_enabled               boolean NOT NULL DEFAULT false,
  voice_type               text NOT NULL DEFAULT 'female_professional',
  language                 text NOT NULL DEFAULT 'en-US',
  greeting_message         text,
  working_hours_start      time NOT NULL DEFAULT '09:00',
  working_hours_end        time NOT NULL DEFAULT '18:00',
  working_days             int[] NOT NULL DEFAULT '{1,2,3,4,5}',
  max_call_duration_seconds int NOT NULL DEFAULT 300,
  fallback_phone           text,
  booking_rules            jsonb NOT NULL DEFAULT '{"min_hours_ahead":2,"max_days_ahead":30,"allow_same_day":false}',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CALLS
-- ============================================================
CREATE TABLE public.calls (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id       uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  phone_number     text NOT NULL,
  call_type        public.call_type NOT NULL DEFAULT 'query',
  intent           text,
  duration_seconds int,
  outcome          public.call_outcome,
  summary          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_clinic_id  ON public.calls(clinic_id);
CREATE INDEX idx_calls_created_at ON public.calls(created_at);

-- ============================================================
-- CONVERSATIONS
-- ============================================================
CREATE TABLE public.conversations (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id   uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  speaker   public.speaker_type NOT NULL,
  message   text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_call_id ON public.conversations(call_id);

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_clinics_updated_at        BEFORE UPDATE ON public.clinics        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_users_updated_at          BEFORE UPDATE ON public.users          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_doctors_updated_at        BEFORE UPDATE ON public.doctors        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_patients_updated_at       BEFORE UPDATE ON public.patients       FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_appointments_updated_at   BEFORE UPDATE ON public.appointments   FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_voice_config_updated_at   BEFORE UPDATE ON public.voice_agent_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_calls_updated_at          BEFORE UPDATE ON public.calls          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RLS — Enable but allow service_role full access
-- (API routes use service_role key, so no user-level policies needed)
-- ============================================================
ALTER TABLE public.clinics             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_agent_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations       ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS automatically.
-- Users table: fully locked — only service_role can read (contains password_hash)
CREATE POLICY "deny_all_users"  ON public.users FOR ALL TO anon, authenticated USING (false);

-- All other tables: allow anon SELECT (frontend uses anon key for data reads).
-- Writes go through service_role API routes only.
CREATE POLICY "allow_select" ON public.clinics             FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.departments         FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.doctors             FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.doctor_availability FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.patients            FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.appointments        FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.voice_agent_config  FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.calls               FOR SELECT TO anon USING (true);
CREATE POLICY "allow_select" ON public.conversations       FOR SELECT TO anon USING (true);

-- Block writes from anon
CREATE POLICY "deny_write" ON public.clinics             FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_write" ON public.departments         FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_write" ON public.doctors             FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_write" ON public.patients            FOR INSERT TO anon WITH CHECK (false);
CREATE POLICY "deny_write" ON public.appointments        FOR INSERT TO anon WITH CHECK (false);

-- ============================================================
-- SEED: Default Super Admin
-- Password: Admin@1234  (bcrypt hash — change after first login)
-- ============================================================
INSERT INTO public.users (email, password_hash, full_name, role)
VALUES (
  'admin@clinicai.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbQQFLm2y',
  'Super Admin',
  'admin'
);
