-- Create accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index on owner_id for performance
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own accounts"
ON accounts
FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own accounts"
ON accounts
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own accounts"
ON accounts
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own accounts"
ON accounts
FOR DELETE
USING (auth.uid() = owner_id); 