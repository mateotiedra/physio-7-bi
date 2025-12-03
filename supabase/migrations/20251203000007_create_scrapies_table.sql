-- Create scrapies table to track scraper activity
CREATE TABLE IF NOT EXISTS scrapies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scraper_id TEXT NOT NULL,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    page_index INTEGER NOT NULL,
    row_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scrapies_scraper_id ON scrapies(scraper_id);
CREATE INDEX IF NOT EXISTS idx_scrapies_patient_id ON scrapies(patient_id);
CREATE INDEX IF NOT EXISTS idx_scrapies_page_row ON scrapies(page_index, row_index);
CREATE INDEX IF NOT EXISTS idx_scrapies_created_at ON scrapies(created_at);
