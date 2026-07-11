-- Rollback for migration 0005. Run in Supabase SQL editor if you need to undo.
-- Drops in reverse dependency order. Pre-existing tables/columns from 0002-0004
-- are left untouched except where 0005 added nullable columns (removed here).

DROP TABLE IF EXISTS lab_explanations CASCADE;
DROP TABLE IF EXISTS lab_report_markers CASCADE;
DROP TABLE IF EXISTS lab_reports CASCADE;

DROP TABLE IF EXISTS triage_results CASCADE;
DROP TABLE IF EXISTS triage_answers CASCADE;
DROP TABLE IF EXISTS symptom_triage_sessions CASCADE;

DROP TABLE IF EXISTS adherence_alerts CASCADE;
DROP TABLE IF EXISTS adherence_logs CASCADE;
DROP TABLE IF EXISTS follow_up_plans CASCADE;

DROP TABLE IF EXISTS reminder_events CASCADE;

ALTER TABLE appointments
  DROP COLUMN IF EXISTS no_show_marked_at,
  DROP COLUMN IF EXISTS no_show_marked_by;

ALTER TABLE appointment_reminders
  DROP COLUMN IF EXISTS channel;

ALTER TABLE reminder_settings
  DROP COLUMN IF EXISTS channel_appointment_24h,
  DROP COLUMN IF EXISTS channel_appointment_2h,
  DROP COLUMN IF EXISTS channel_post_visit,
  DROP COLUMN IF EXISTS channel_birthday;

ALTER TABLE users
  DROP COLUMN IF EXISTS doctor_id;

-- Note: Postgres cannot remove values from an existing ENUM type without
-- recreating it. 'doctor'/'receptionist' on user_role and
-- 'booking_confirmation'/'medication'/'follow_up_visit' on reminder_type are
-- left in place — harmless if unused. If a full revert is required, recreate
-- the enum types manually (see 0002/0004 for the pattern) after confirming
-- no rows reference the new values.

-- Revert the feature-flag keys added to subscription_plans.features.
UPDATE subscription_plans
SET features = features - 'medicine_adherence' - 'symptom_triage' - 'lab_report_explain';
