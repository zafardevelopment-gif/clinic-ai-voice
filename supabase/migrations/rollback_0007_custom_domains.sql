-- Rollback for migration 0007.
DROP INDEX IF EXISTS clinics_custom_domain_unique;
ALTER TABLE clinics
  DROP COLUMN IF EXISTS custom_domain,
  DROP COLUMN IF EXISTS domain_status,
  DROP COLUMN IF EXISTS domain_verification,
  DROP COLUMN IF EXISTS domain_added_at,
  DROP COLUMN IF EXISTS domain_checked_at;
DROP TYPE IF EXISTS domain_status;
