-- Minimal Knowledge Graph Support Migration
-- This adds only the essential columns needed for Knowledge Graph functionality
-- without duplicating existing RAG infrastructure

-- Add is_global column to support company-wide vs account-specific documents
ALTER TABLE account_data_sources 
ADD COLUMN is_global BOOLEAN DEFAULT false;

-- Add graph_position column to save node positions in the visualization
ALTER TABLE account_data_sources 
ADD COLUMN graph_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb;

-- Add index for efficient filtering by is_global
CREATE INDEX idx_account_data_sources_is_global ON account_data_sources(is_global);

-- Add helpful comments
COMMENT ON COLUMN account_data_sources.is_global IS 'When true, this document is visible across all accounts as company-wide knowledge';
COMMENT ON COLUMN account_data_sources.graph_position IS 'Stores x,y coordinates for Knowledge Graph node positioning'; 