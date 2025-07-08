-- Create ENUM types for chat_messages
CREATE TYPE chat_role AS ENUM ('user', 'assistant');
CREATE TYPE message_type AS ENUM ('thought', 'tool_call', 'response');

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content TEXT,
  message_type message_type,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_chat_messages_document_id ON chat_messages(document_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view chat messages for documents they can access"
ON chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = chat_messages.document_id
  )
);

CREATE POLICY "Users can insert chat messages for documents they can access"
ON chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = chat_messages.document_id
  )
); 