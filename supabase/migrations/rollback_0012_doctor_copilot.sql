-- Rollback for migration 0012. Run in Supabase SQL editor if you need to undo.

DROP TABLE IF EXISTS formulary_medications CASCADE;

ALTER TABLE triage_results
  DROP COLUMN IF EXISTS ai_suggested_questions,
  DROP COLUMN IF EXISTS ai_suggested_diagnoses,
  DROP COLUMN IF EXISTS ai_suggested_tests,
  DROP COLUMN IF EXISTS ai_suggested_medications,
  DROP COLUMN IF EXISTS doctor_final_diagnosis,
  DROP COLUMN IF EXISTS doctor_final_prescription,
  DROP COLUMN IF EXISTS ai_suggestions_accepted_count,
  DROP COLUMN IF EXISTS ai_suggestions_total_count,
  DROP COLUMN IF EXISTS finalized_at,
  DROP COLUMN IF EXISTS finalized_by;

ALTER TABLE triage_answers
  DROP COLUMN IF EXISTS qa_log;

ALTER TABLE symptom_triage_sessions DROP CONSTRAINT IF EXISTS symptom_triage_sessions_source_check;
ALTER TABLE symptom_triage_sessions ADD CONSTRAINT symptom_triage_sessions_source_check
  CHECK (source IN ('website', 'counter', 'voice_followup'));

ALTER TABLE symptom_triage_sessions
  DROP COLUMN IF EXISTS mode;
