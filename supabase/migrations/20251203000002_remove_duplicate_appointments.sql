-- Remove duplicate appointments keeping only the oldest one (by created_at)
DELETE FROM appointments a
USING appointments b
WHERE a.id > b.id
  AND a.patient_id = b.patient_id
  AND a.date = b.date
  AND a.date IS NOT NULL;

-- Add unique constraint on appointments table for (patient_id, date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_unique_patient_date
    ON appointments(patient_id, date)
    WHERE date IS NOT NULL;
