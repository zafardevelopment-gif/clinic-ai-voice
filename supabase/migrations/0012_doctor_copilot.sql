-- ═══════════════════════════════════════════════════════════════════════════
-- Doctor-Side AI Clinical Co-Pilot (spec §6A) — schema
-- Migration 0012 (additive on top of 0002–0011)
--
-- What this adds:
--   - symptom_triage_sessions.mode: 'patient_intake' (existing flow,
--     default — unaffected) | 'doctor_copilot' (new: a doctor-run live
--     consultation session).
--   - triage_answers gains a running Q&A log for the co-pilot flow
--     (chief_complaint already exists and doubles as the presenting
--     complaint here; qa_log is new).
--   - triage_results gains the co-pilot's AI-suggestion + doctor-final
--     columns. Kept on the SAME table as patient-intake triage results
--     (rather than a parallel table) so both flows share one queryable
--     history, one RLS/ownership model, and one review-audit table —
--     the `mode` column is what a query filters on to tell them apart.
--   - formulary_medications: the curated drug reference the co-pilot's
--     medication suggestions MUST be sourced from (never freely generated
--     by the LLM — see src/lib/ai/copilot.ts). Seeded with a small common
--     set; clinics/admins can extend it later via /admin.
--
-- Regulatory note (carried from the spec): differential/test/medication
-- suggestions are advisory-only, require explicit doctor Accept/Edit/Reject
-- (never auto-applied), and every suggestion is retained alongside the
-- doctor's final decision for audit — see ai_suggestions_total_count /
-- ai_suggestions_accepted_count and the doctor_final_* columns below.
--
-- Additive/idempotent — safe to re-run (IF NOT EXISTS / duplicate_object
-- guards throughout), matching the style of prior migrations.
--
-- To rollback, run: rollback_0012_doctor_copilot.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── symptom_triage_sessions: mode ────────────────────────────────────────
ALTER TABLE symptom_triage_sessions
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'patient_intake'
    CHECK (mode IN ('patient_intake', 'doctor_copilot'));

-- Co-Pilot sessions are doctor-run and don't necessarily start from a
-- website/counter/voice-followup "source" the way patient-intake triage
-- does — but the column is NOT NULL, so widen the allowed values rather
-- than making it nullable (keeps existing queries that assume NOT NULL
-- intact).
ALTER TABLE symptom_triage_sessions DROP CONSTRAINT IF EXISTS symptom_triage_sessions_source_check;
ALTER TABLE symptom_triage_sessions ADD CONSTRAINT symptom_triage_sessions_source_check
  CHECK (source IN ('website', 'counter', 'voice_followup', 'doctor_copilot'));

CREATE INDEX IF NOT EXISTS idx_triage_sessions_mode
  ON symptom_triage_sessions (clinic_id, mode, created_at DESC);

-- ── triage_answers: running Q&A log for the co-pilot ─────────────────────
ALTER TABLE triage_answers
  ADD COLUMN IF NOT EXISTS qa_log JSONB NOT NULL DEFAULT '[]'::jsonb;
  -- shape: [{ question: string, answer: string, source: 'ai_suggested' | 'doctor_added', answered_at: timestamptz }]

-- ── triage_results: co-pilot AI suggestions + doctor final decision ─────
ALTER TABLE triage_results
  ADD COLUMN IF NOT EXISTS ai_suggested_questions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- shape: [{ question: string, priority: 'red_flag' | 'routine' }]
  ADD COLUMN IF NOT EXISTS ai_suggested_diagnoses    JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- shape: [{ condition: string, confidence_note: string, status: 'pending' | 'accepted' | 'edited' | 'rejected' }]
  ADD COLUMN IF NOT EXISTS ai_suggested_tests        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- shape: [{ test_name: string, reason: string, status: 'pending' | 'accepted' | 'edited' | 'rejected' }]
  ADD COLUMN IF NOT EXISTS ai_suggested_medications  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- shape: [{ formulary_id: uuid, drug: string, dosage_range: string, source_reference: string, status: 'pending' | 'accepted' | 'edited' | 'rejected' }]
  ADD COLUMN IF NOT EXISTS doctor_final_diagnosis    TEXT,
  ADD COLUMN IF NOT EXISTS doctor_final_prescription JSONB,
  -- shape: [{ drug: string, dosage: string, frequency: string, duration_days: number | null, formulary_id: uuid | null }]
  ADD COLUMN IF NOT EXISTS ai_suggestions_accepted_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_suggestions_total_count    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS finalized_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finalized_by               UUID REFERENCES users(id) ON DELETE SET NULL;
  -- finalized_by + finalized_at together are the "e-signature" record —
  -- finalize is only reachable after the finalizing doctor re-enters their
  -- login password (verified server-side, see /api/clinic/copilot/[id]/finalize).

-- ── formulary_medications: curated reference for medication suggestions ─
CREATE TABLE IF NOT EXISTS formulary_medications (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_name         TEXT NOT NULL,
  drug_class        TEXT,
  indication_keywords TEXT[] NOT NULL DEFAULT '{}',  -- matched against complaint/diagnosis text to narrow candidates before the LLM sees them
  dosage_range      TEXT NOT NULL,                    -- e.g. "500mg every 8h, max 3g/day"
  source_reference  TEXT NOT NULL,                    -- e.g. "WHO Model Formulary 2021" / "Standard Treatment Guidelines (India)"
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formulary_medications_keywords
  ON formulary_medications USING GIN (indication_keywords) WHERE is_active;

DO $$ BEGIN
  CREATE TRIGGER trg_formulary_medications_updated_at
    BEFORE UPDATE ON formulary_medications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Small starter seed — common outpatient complaints only. Not a complete
-- formulary; clinics/admins extend this over time via /admin.
INSERT INTO formulary_medications (drug_name, drug_class, indication_keywords, dosage_range, source_reference)
SELECT * FROM (VALUES
  ('Paracetamol',       'Analgesic/Antipyretic', ARRAY['fever','pain','headache','body ache'],            '500-1000mg every 6-8h, max 3g/day (adult)',        'WHO Model Formulary 2021'),
  ('Ibuprofen',         'NSAID',                 ARRAY['pain','inflammation','fever','headache'],          '200-400mg every 6-8h, max 1.2g/day (adult)',        'WHO Model Formulary 2021'),
  ('Oral Rehydration Salts', 'Rehydration',       ARRAY['diarrhea','vomiting','dehydration'],               'As per WHO ORS mixing instructions, ad lib',        'WHO Model Formulary 2021'),
  ('Amoxicillin',       'Antibiotic (Penicillin)', ARRAY['throat infection','bacterial infection','ear infection'], '500mg every 8h for 5-7 days (adult)',       'Standard Treatment Guidelines (India)'),
  ('Cetirizine',        'Antihistamine',         ARRAY['allergy','rash','itching','runny nose'],           '10mg once daily (adult)',                           'WHO Model Formulary 2021'),
  ('Loperamide',        'Antidiarrheal',         ARRAY['diarrhea'],                                        '4mg initially, then 2mg after each loose stool, max 16mg/day (adult)', 'WHO Model Formulary 2021'),
  ('Omeprazole',        'Proton Pump Inhibitor', ARRAY['acidity','heartburn','gastritis','stomach pain'],  '20mg once daily before food',                       'Standard Treatment Guidelines (India)'),
  ('Salbutamol Inhaler','Bronchodilator',        ARRAY['wheeze','asthma','breathlessness'],                '1-2 puffs (100mcg/puff) as needed, max 8 puffs/day', 'WHO Model Formulary 2021')
) AS seed(drug_name, drug_class, indication_keywords, dosage_range, source_reference)
WHERE NOT EXISTS (SELECT 1 FROM formulary_medications LIMIT 1);
