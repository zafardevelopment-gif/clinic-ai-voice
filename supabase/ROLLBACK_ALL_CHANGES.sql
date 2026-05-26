-- ═══════════════════════════════════════════════════════════════════════════
-- ClinicPing — ROLLBACK All Database Changes
--
-- Run this in Supabase SQL Editor ONLY if you need to fully undo the
-- changes from RUN_ME_ALL_CHANGES.sql.
--
-- WARNING: This DROPS data in the new tables. Existing tables (clinics,
-- patients, appointments, etc.) are untouched.
-- ═══════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS clinic_has_feature(UUID, TEXT);

DROP TABLE IF EXISTS subscription_audit_log CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS clinic_subscriptions CASCADE;
DROP TABLE IF EXISTS appointment_reminders CASCADE;
DROP TABLE IF EXISTS reminder_settings CASCADE;

DROP TYPE IF EXISTS subscription_status_t;
DROP TYPE IF EXISTS subscription_plan;
DROP TYPE IF EXISTS reminder_response;
DROP TYPE IF EXISTS reminder_status;
DROP TYPE IF EXISTS reminder_type;
