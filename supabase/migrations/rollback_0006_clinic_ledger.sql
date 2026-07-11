-- Rollback for migration 0006.
DROP TABLE IF EXISTS clinic_ledger_entries CASCADE;
DROP TYPE IF EXISTS ledger_entry_type;
