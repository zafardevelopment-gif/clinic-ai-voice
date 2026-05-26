-- Rollback for migration 0003.

DROP FUNCTION IF EXISTS clinic_has_feature(UUID, TEXT);
DROP TABLE IF EXISTS subscription_audit_log CASCADE;
ALTER TABLE clinic_subscriptions DROP COLUMN IF EXISTS feature_overrides;
DROP TABLE IF EXISTS subscription_plans CASCADE;
