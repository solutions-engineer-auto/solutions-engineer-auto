-- Verification SQL - Run this in Supabase SQL Editor after applying migrations
-- This checks if all Knowledge Graph features are properly set up

-- 1. Check if new columns were added to account_data_sources
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'account_data_sources' 
  AND column_name IN ('is_global', 'graph_position', 'embedding')
ORDER BY column_name;

-- 2. Check if global_knowledge_base table was created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_name = 'global_knowledge_base';

-- 3. Check if indexes were created
SELECT 
  indexname, 
  tablename, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'account_data_sources' 
  AND indexname LIKE '%global%';

-- 4. Check if vector functions were created
SELECT 
  routine_name, 
  routine_type,
  specific_name
FROM information_schema.routines 
WHERE routine_name LIKE '%embedding%' 
   OR routine_name LIKE '%relationship%'
ORDER BY routine_name;

-- 5. Check your existing vector database status
SELECT 
  COUNT(*) as total_embeddings,
  COUNT(DISTINCT account_data_source_id) as documents_with_embeddings
FROM document_embeddings;

-- 6. Test basic functions work (only if you have embeddings)
-- SELECT * FROM get_embedding_statistics() LIMIT 1; 