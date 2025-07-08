-- Create account_data_sources table
CREATE TABLE account_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_account_data_sources_account_id ON account_data_sources(account_id);

-- Enable RLS
ALTER TABLE account_data_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage data sources for their own accounts"
ON account_data_sources
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = account_data_sources.account_id
    AND accounts.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = account_data_sources.account_id
    AND accounts.owner_id = auth.uid()
  )
); 