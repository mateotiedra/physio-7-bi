-- Add status column to invoices table
ALTER TABLE invoices
ADD COLUMN status TEXT;

-- Add index on status for better query performance
CREATE INDEX idx_invoices_status ON invoices(status);
