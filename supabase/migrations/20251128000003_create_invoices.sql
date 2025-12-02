-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    patient_avs TEXT,
    centre TEXT,
    date TEXT,
    invoice_number TEXT,
    no_assured_person TEXT,
    reimbursment_type TEXT,
    law TEXT,
    treatment_type TEXT,
    no_assured_card TEXT,
    treatment_start_date TEXT,
    treatment_end_date TEXT,
    prestation_location TEXT,
    prescribing_doctor TEXT,
    prescribing_doctor_address TEXT,
    case_date TEXT,
    decision_number TEXT,
    total_amount DECIMAL(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoices_patient_id ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
CREATE INDEX IF NOT EXISTS idx_invoices_centre ON invoices(centre);
CREATE INDEX IF NOT EXISTS idx_invoices_patient_avs ON invoices(patient_avs) WHERE patient_avs IS NOT NULL;

-- Create unique constraint on invoice_number + centre
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_unique_number_centre 
    ON invoices(invoice_number, centre) 
    WHERE invoice_number IS NOT NULL AND centre IS NOT NULL;

-- Create trigger for invoices table
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
