-- Add is_global flag to account_data_sources table
-- This allows documents to be marked as company-wide knowledge vs account-specific

ALTER TABLE account_data_sources 
ADD COLUMN is_global BOOLEAN DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX idx_account_data_sources_is_global ON account_data_sources(is_global);

-- Add graph position for future use
ALTER TABLE account_data_sources 
ADD COLUMN graph_position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb;

-- Add embedding column for semantic relationships (future use)
ALTER TABLE account_data_sources 
ADD COLUMN embedding vector(1536);

-- Create global knowledge base table for truly global documents
CREATE TABLE IF NOT EXISTS global_knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  graph_position JSONB DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies for global knowledge
ALTER TABLE global_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Everyone can read global knowledge
CREATE POLICY "Global knowledge is readable by all authenticated users" 
ON global_knowledge_base FOR SELECT 
TO authenticated 
USING (true);

-- Only admins can modify global knowledge (you can adjust this based on your needs)
CREATE POLICY "Only admins can insert global knowledge" 
ON global_knowledge_base FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE id = auth.uid() 
  AND raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Only admins can update global knowledge" 
ON global_knowledge_base FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE id = auth.uid() 
  AND raw_user_meta_data->>'role' = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE id = auth.uid() 
  AND raw_user_meta_data->>'role' = 'admin'
));

CREATE POLICY "Only admins can delete global knowledge" 
ON global_knowledge_base FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM auth.users 
  WHERE id = auth.uid() 
  AND raw_user_meta_data->>'role' = 'admin'
));

-- Add comment
COMMENT ON COLUMN account_data_sources.is_global IS 'When true, this document is part of the company-wide knowledge base visible across all accounts';
COMMENT ON COLUMN account_data_sources.graph_position IS 'Position of this document node in the knowledge graph visualization';
COMMENT ON COLUMN account_data_sources.embedding IS 'Vector embedding for semantic similarity calculations';
COMMENT ON TABLE global_knowledge_base IS 'Company-wide knowledge documents accessible to all accounts'; 