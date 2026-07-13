-- Rollback for migration 0009.
ALTER TABLE adherence_logs DROP CONSTRAINT IF EXISTS adherence_logs_channel_check;
ALTER TABLE adherence_logs ADD CONSTRAINT adherence_logs_channel_check
  CHECK (channel IN ('voice', 'whatsapp', 'sms', 'staff'));

ALTER TABLE appointment_reminders DROP CONSTRAINT IF EXISTS appointment_reminders_channel_check;
ALTER TABLE appointment_reminders ADD CONSTRAINT appointment_reminders_channel_check
  CHECK (channel IN ('voice', 'whatsapp', 'sms'));

DROP TABLE IF EXISTS family_contacts;
DROP TABLE IF EXISTS patient_medicine_doses;
DROP TYPE IF EXISTS dose_status;
DROP TABLE IF EXISTS patient_medicines;
DROP TYPE IF EXISTS medicine_source;
DROP TABLE IF EXISTS patient_diseases;

DROP INDEX IF EXISTS patients_email_unique;
ALTER TABLE patients
  DROP COLUMN IF EXISTS password_hash,
  DROP COLUMN IF EXISTS is_independent,
  DROP COLUMN IF EXISTS subscription_status,
  DROP COLUMN IF EXISTS expo_push_token,
  DROP COLUMN IF EXISTS last_login_at;

-- NOTE: does not restore clinic_id NOT NULL — any independent (clinic_id
-- IS NULL) patient rows created after 0009 would violate that constraint.
-- Reapply manually only after confirming no such rows exist:
--   ALTER TABLE patients ALTER COLUMN clinic_id SET NOT NULL;
