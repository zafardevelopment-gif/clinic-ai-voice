-- Rollback for migration 0013. Run in Supabase SQL editor if you need to undo.

DROP TABLE IF EXISTS patient_media CASCADE;

DROP TYPE IF EXISTS patient_media_type;
DROP TYPE IF EXISTS patient_media_uploader;
