-- Rollback for migration 0002. Run in Supabase SQL editor if you need to undo.
-- Drops in reverse dependency order. Existing tables (clinics, etc.) untouched.

DROP TABLE IF EXISTS clinic_subscriptions CASCADE;
DROP TABLE IF EXISTS appointment_reminders CASCADE;
DROP TABLE IF EXISTS reminder_settings CASCADE;

DROP TYPE IF EXISTS subscription_status_t;
DROP TYPE IF EXISTS subscription_plan;
DROP TYPE IF EXISTS reminder_response;
DROP TYPE IF EXISTS reminder_status;
DROP TYPE IF EXISTS reminder_type;
