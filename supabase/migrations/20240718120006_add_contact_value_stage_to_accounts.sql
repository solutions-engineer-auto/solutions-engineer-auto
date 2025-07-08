-- Add missing fields to accounts table
ALTER TABLE accounts 
ADD COLUMN contact VARCHAR,
ADD COLUMN value VARCHAR DEFAULT '$0',
ADD COLUMN stage VARCHAR DEFAULT 'Discovery',
ADD COLUMN description TEXT,
ADD COLUMN last_updated TIMESTAMPTZ DEFAULT NOW();

-- Create trigger to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON accounts
FOR EACH ROW
EXECUTE FUNCTION update_accounts_updated_at();

-- Update any existing accounts with default values
UPDATE accounts 
SET 
  contact = 'Not specified',
  value = '$0',
  stage = 'Discovery',
  last_updated = NOW()
WHERE contact IS NULL; 