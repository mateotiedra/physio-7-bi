-- Remove duplicate services keeping only the oldest one (by created_at)
DELETE FROM services a
USING services b
WHERE a.id > b.id
  AND a.invoice_id = b.invoice_id
  AND a.date = b.date
  AND a.position_number = b.position_number
  AND a.date IS NOT NULL
  AND a.position_number IS NOT NULL;

-- Add unique constraint on services table for (invoice_id, date, position_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_services_unique_invoice_date_position
    ON services(invoice_id, date, position_number)
    WHERE date IS NOT NULL AND position_number IS NOT NULL;

