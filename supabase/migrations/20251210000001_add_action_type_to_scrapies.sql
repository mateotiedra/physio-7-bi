-- Add action_type column to scrapies table to track the type of scrape action
ALTER TABLE scrapies 
ADD COLUMN action_type TEXT CHECK (action_type IN ('created', 'updated', 'skipped')) DEFAULT 'skipped';

-- Add index for action_type for filtering queries
CREATE INDEX IF NOT EXISTS idx_scrapies_action_type ON scrapies(action_type);

-- Add comment to explain the column
COMMENT ON COLUMN scrapies.action_type IS 'Type of scrape action: created (new patient), updated (existing patient updated), skipped (already up to date)';
