-- ═══════════════════════════════════════════════════════════
-- CLINIC AI VOICE AGENT — SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────
CREATE TYPE user_role        AS ENUM ('admin', 'clinic_admin');
CREATE TYPE call_type        AS ENUM ('booking', 'query', 'followup');
CREATE TYPE call_outcome     AS ENUM ('booked', 'not_booked', 'callback', 'transferred');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE speaker_type     AS ENUM ('user', 'ai');

-- ─── CLINICS ─────────────────────────────────────────────
CREATE TABLE clinics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  city              TEXT,
  country           TEXT DEFAULT 'Pakistan',
  logo_url          TEXT,
  is_active         BOOLEAN DEFAULT true,
  subscription_plan TEXT DEFAULT 'starter',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROFILES (extends auth.users) ───────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        user_role NOT NULL DEFAULT 'clinic_admin',
  clinic_id   UUID REFERENCES clinics(id) ON DELETE SET NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DEPARTMENTS ─────────────────────────────────────────
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id   UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCTORS ─────────────────────────────────────────────
CREATE TABLE doctors (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id              UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  department_id          UUID REFERENCES departments(id) ON DELETE SET NULL,
  full_name              TEXT NOT NULL,
  specialization         TEXT,
  phone                  TEXT,
  email                  TEXT,
  bio                    TEXT,
  avatar_url             TEXT,
  is_active              BOOLEAN DEFAULT true,
  booking_min_hours      INTEGER DEFAULT 2,
  booking_max_days       INTEGER DEFAULT 30,
  slot_duration_minutes  INTEGER DEFAULT 30,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCTOR AVAILABILITY ─────────────────────────────────
CREATE TABLE doctor_availability (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week  SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 6=Sat
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, day_of_week)
);

-- ─── PATIENTS ────────────────────────────────────────────
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id     UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  date_of_birth DATE,
  gender        TEXT,
  address       TEXT,
  medical_notes TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── APPOINTMENTS ────────────────────────────────────────
CREATE TABLE appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id         UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id         UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  department_id     UUID REFERENCES departments(id) ON DELETE SET NULL,
  appointment_date  DATE NOT NULL,
  appointment_time  TIME NOT NULL,
  duration_minutes  INTEGER DEFAULT 30,
  status            appointment_status DEFAULT 'scheduled',
  reason            TEXT,
  notes             TEXT,
  booked_via        TEXT DEFAULT 'manual', -- 'manual' | 'ai_voice' | 'online'
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── VOICE AGENT CONFIG ──────────────────────────────────
CREATE TABLE voice_agent_config (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id                 UUID NOT NULL UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  is_enabled                BOOLEAN DEFAULT false,
  voice_type                TEXT DEFAULT 'female_professional',
  language                  TEXT DEFAULT 'en-US',
  greeting_message          TEXT DEFAULT 'Hello! Thank you for calling. How can I help you today?',
  working_hours_start       TIME DEFAULT '09:00',
  working_hours_end         TIME DEFAULT '18:00',
  working_days              SMALLINT[] DEFAULT ARRAY[1,2,3,4,5], -- Mon–Fri
  booking_rules             JSONB DEFAULT '{"min_hours_ahead": 2, "max_days_ahead": 30, "allow_same_day": false}'::jsonb,
  max_call_duration_seconds INTEGER DEFAULT 300,
  fallback_phone            TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CALLS ───────────────────────────────────────────────
CREATE TABLE calls (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id        UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  phone_number     TEXT NOT NULL,
  patient_id       UUID REFERENCES patients(id) ON DELETE SET NULL,
  call_type        call_type NOT NULL DEFAULT 'query',
  intent           TEXT,
  duration_seconds INTEGER,
  outcome          call_outcome,
  summary          TEXT,
  recording_url    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONVERSATIONS ───────────────────────────────────────
CREATE TABLE conversations (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_id   UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  speaker   speaker_type NOT NULL,
  message   TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata  JSONB
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_profiles_clinic_id          ON profiles(clinic_id);
CREATE INDEX idx_departments_clinic_id       ON departments(clinic_id);
CREATE INDEX idx_doctors_clinic_id           ON doctors(clinic_id);
CREATE INDEX idx_doctors_department_id       ON doctors(department_id);
CREATE INDEX idx_doctor_avail_doctor_id      ON doctor_availability(doctor_id);
CREATE INDEX idx_patients_clinic_id          ON patients(clinic_id);
CREATE INDEX idx_patients_phone              ON patients(phone);
CREATE INDEX idx_appointments_clinic_id      ON appointments(clinic_id);
CREATE INDEX idx_appointments_patient_id     ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id      ON appointments(doctor_id);
CREATE INDEX idx_appointments_date           ON appointments(appointment_date);
CREATE INDEX idx_calls_clinic_id             ON calls(clinic_id);
CREATE INDEX idx_calls_created_at            ON calls(created_at DESC);
CREATE INDEX idx_calls_patient_id            ON calls(patient_id);
CREATE INDEX idx_conversations_call_id       ON conversations(call_id);
CREATE INDEX idx_conversations_timestamp     ON conversations(timestamp);

-- ═══════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clinics_updated_at
  BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_doctors_updated_at
  BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_voice_config_updated_at
  BEFORE UPDATE ON voice_agent_config FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'clinic_admin')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls              ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations      ENABLE ROW LEVEL SECURITY;

-- Helper: get caller's role
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get caller's clinic_id
CREATE OR REPLACE FUNCTION auth_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ──
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid() OR auth_role() = 'admin');
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid() OR auth_role() = 'admin');

-- ── CLINICS ──
CREATE POLICY "clinics_admin_all" ON clinics
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "clinics_clinic_read" ON clinics
  FOR SELECT USING (id = auth_clinic_id());

-- ── DEPARTMENTS ──
CREATE POLICY "depts_admin_all" ON departments
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "depts_clinic_all" ON departments
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ── DOCTORS ──
CREATE POLICY "doctors_admin_all" ON doctors
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "doctors_clinic_all" ON doctors
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ── DOCTOR AVAILABILITY ──
CREATE POLICY "avail_admin_all" ON doctor_availability
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "avail_clinic_all" ON doctor_availability
  FOR ALL USING (
    doctor_id IN (SELECT id FROM doctors WHERE clinic_id = auth_clinic_id())
  );

-- ── PATIENTS ──
CREATE POLICY "patients_admin_all" ON patients
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "patients_clinic_all" ON patients
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ── APPOINTMENTS ──
CREATE POLICY "appts_admin_all" ON appointments
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "appts_clinic_all" ON appointments
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ── VOICE AGENT CONFIG ──
CREATE POLICY "voice_config_admin_all" ON voice_agent_config
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "voice_config_clinic_all" ON voice_agent_config
  FOR ALL USING (clinic_id = auth_clinic_id());

-- ── CALLS ──
CREATE POLICY "calls_admin_all" ON calls
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "calls_clinic_all" ON calls
  FOR ALL USING (clinic_id = auth_clinic_id());

-- Allow service role (API routes) to insert calls
CREATE POLICY "calls_service_insert" ON calls
  FOR INSERT WITH CHECK (true);

-- ── CONVERSATIONS ──
CREATE POLICY "conv_admin_all" ON conversations
  FOR ALL USING (auth_role() = 'admin');
CREATE POLICY "conv_clinic_select" ON conversations
  FOR SELECT USING (
    call_id IN (SELECT id FROM calls WHERE clinic_id = auth_clinic_id())
  );
CREATE POLICY "conv_service_insert" ON conversations
  FOR INSERT WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- SEED: CREATE SUPER ADMIN
-- Replace with your actual admin email before running
-- ═══════════════════════════════════════════════════════════
-- INSERT INTO auth.users ... (use Supabase Dashboard → Authentication → Users → Invite)
-- Then update role:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@example.com';
