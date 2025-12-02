-- Remove dob column from patients table
ALTER TABLE patients DROP COLUMN IF EXISTS dob;
