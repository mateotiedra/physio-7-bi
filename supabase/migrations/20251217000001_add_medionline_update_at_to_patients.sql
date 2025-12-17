-- Add medionline_created_at and medionline_update_at columns to patients table
-- These columns track when the patient data was created and last updated in MediOnline

ALTER TABLE patients
ADD COLUMN registered_at TIMESTAMPTZ,
ADD COLUMN details_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN patients.registered_at IS 'Timestamp of when the patient data was first created';
COMMENT ON COLUMN patients.details_updated_at IS 'Timestamp of when the patient details were last updated outside the database';