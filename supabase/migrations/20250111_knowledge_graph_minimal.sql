-- Minimal Knowledge Graph Migration
-- Only adds what's needed without duplicating existing vector infrastructure

-- 1. Add is_global flag for company-wide vs account-specific documents
ALTER TABLE account_data_sources 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 2. Add graph_position to save node positions in the visualization
ALTER TABLE account_data_sources 
ADD COLUMN IF NOT EXISTS graph_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb;

-- 3. Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_account_data_sources_is_global 
ON account_data_sources(is_global);

-- That's it! Your existing document_embeddings table handles all the RAG/semantic needs

-- Add helpful comments
COMMENT ON COLUMN account_data_sources.is_global IS 'When true, this document is visible across all accounts';
COMMENT ON COLUMN account_data_sources.graph_position IS 'Stores x,y coordinates for Knowledge Graph visualization'; 