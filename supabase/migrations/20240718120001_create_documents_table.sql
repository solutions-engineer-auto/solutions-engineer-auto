-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR NOT NULL,
  content TEXT,
  document_type VARCHAR,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_documents_account_id ON documents(account_id);
CREATE INDEX idx_documents_author_id ON documents(author_id);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own documents"
ON documents
FOR SELECT
USING (
  auth.uid() = author_id OR
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = documents.account_id
    AND accounts.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert documents for their accounts"
ON documents
FOR INSERT
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = documents.account_id
    AND accounts.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own documents"
ON documents
FOR UPDATE
USING (
  auth.uid() = author_id OR
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = documents.account_id
    AND accounts.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own documents"
ON documents
FOR DELETE
USING (
  auth.uid() = author_id OR
  EXISTS (
    SELECT 1 FROM accounts
    WHERE accounts.id = documents.account_id
    AND accounts.owner_id = auth.uid()
  )
); 