-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    date TEXT,
    number DECIMAL(10, 2),
    position_number TEXT,
    description TEXT,
    unit_value DECIMAL(10, 2),
    pt_nbr DECIMAL(10, 2),
    pt_value DECIMAL(10, 2),
    amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_services_invoice_id ON services(invoice_id);
CREATE INDEX IF NOT EXISTS idx_services_date ON services(date);
