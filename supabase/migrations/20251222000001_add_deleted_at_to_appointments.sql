-- Add deleted_at column to appointments table for soft deletion
ALTER TABLE appointments ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index on deleted_at for query performance
CREATE INDEX idx_appointments_deleted_at ON appointments(deleted_at);

-- Add comment explaining the column
COMMENT ON COLUMN appointments.deleted_at IS 'Timestamp when appointment was soft deleted. NULL means appointment is active.';
