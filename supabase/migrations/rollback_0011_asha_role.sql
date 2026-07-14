-- Rollback for migration 0011. Run in Supabase SQL editor if you need to undo.

ALTER TABLE patients
  DROP COLUMN IF EXISTS created_by_asha,
  DROP COLUMN IF EXISTS patient_code;

DROP TABLE IF EXISTS asha_profiles CASCADE;

-- Note: Postgres cannot remove a value from an existing ENUM type without
-- recreating it. 'asha' on user_role is left in place — harmless if unused.
-- If a full revert is required, recreate the enum type manually (see
-- 0002/0005 for the pattern) after confirming no rows reference 'asha'.
