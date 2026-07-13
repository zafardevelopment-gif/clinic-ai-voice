-- Rollback for migration 0008.
DROP TABLE IF EXISTS clinic_invoice_items;
DROP TABLE IF EXISTS clinic_invoices;
DROP TYPE IF EXISTS invoice_status;

ALTER TABLE patients
  DROP COLUMN IF EXISTS gstin,
  DROP COLUMN IF EXISTS state;

ALTER TABLE clinics
  DROP COLUMN IF EXISTS gstin,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS pincode,
  DROP COLUMN IF EXISTS invoice_prefix;
