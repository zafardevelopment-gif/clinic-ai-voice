-- Rollback for migration 0010.
DROP TABLE IF EXISTS family_alerts;

DROP TABLE IF EXISTS care_navigator_flags;
DROP TYPE IF EXISTS care_navigator_status;
DROP TYPE IF EXISTS care_navigator_source;

DROP INDEX IF EXISTS idx_lab_reports_uploaded_by_patient;
ALTER TABLE lab_reports
  DROP COLUMN IF EXISTS uploaded_by_patient_id;

-- NOTE: does not restore lab_reports.clinic_id NOT NULL — any
-- patient-uploaded (clinic_id IS NULL) report rows created after 0010
-- would violate that constraint. Reapply manually only after confirming no
-- such rows exist:
--   ALTER TABLE lab_reports ALTER COLUMN clinic_id SET NOT NULL;
