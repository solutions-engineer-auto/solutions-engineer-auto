-- Add functions to generate document relationships using existing document_embeddings
-- This leverages the existing vector database infrastructure

-- Function to generate document relationships from existing embeddings
CREATE OR REPLACE FUNCTION generate_document_relationships_from_embeddings(
  account_id_param UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_relationships INT DEFAULT 50
)
RETURNS TABLE (
  source_id UUID,
  target_id UUID,
  similarity FLOAT,
  source_file_name TEXT,
  target_file_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH document_embeddings_summary AS (
    -- Get average embedding for each document (since documents are chunked)
    SELECT 
      de.account_data_source_id,
      ads.file_name,
      ads.account_id,
      -- Use first embedding as representative (could be improved by averaging)
      (array_agg(de.embedding ORDER BY de.created_at))[1] as representative_embedding
    FROM document_embeddings de
    JOIN account_data_sources ads ON de.account_data_source_id = ads.id
    WHERE (account_id_param IS NULL OR ads.account_id = account_id_param)
    GROUP BY de.account_data_source_id, ads.file_name, ads.account_id
  ),
  document_pairs AS (
    SELECT 
      d1.account_data_source_id as source_id,
      d2.account_data_source_id as target_id,
      1 - (d1.representative_embedding <=> d2.representative_embedding) as similarity,
      d1.file_name as source_file_name,
      d2.file_name as target_file_name
    FROM document_embeddings_summary d1
    CROSS JOIN document_embeddings_summary d2
    WHERE d1.account_data_source_id != d2.account_data_source_id  -- Don't match document with itself
      AND d1.account_data_source_id < d2.account_data_source_id  -- Avoid duplicate pairs
  )
  SELECT 
    dp.source_id,
    dp.target_id,
    dp.similarity,
    dp.source_file_name,
    dp.target_file_name
  FROM document_pairs dp
  WHERE dp.similarity > similarity_threshold
  ORDER BY dp.similarity DESC
  LIMIT max_relationships;
END;
$$;

-- Function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_statistics(
  account_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  total_embeddings BIGINT,
  documents_with_embeddings BIGINT,
  average_chunks_per_document NUMERIC,
  oldest_embedding TIMESTAMPTZ,
  newest_embedding TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH embedding_stats AS (
    SELECT 
      COUNT(*) as total_embeddings,
      COUNT(DISTINCT de.account_data_source_id) as documents_with_embeddings,
      AVG(chunks_per_doc.chunk_count) as average_chunks_per_document,
      MIN(de.created_at) as oldest_embedding,
      MAX(de.created_at) as newest_embedding
    FROM document_embeddings de
    JOIN account_data_sources ads ON de.account_data_source_id = ads.id
    LEFT JOIN (
      SELECT 
        account_data_source_id,
        COUNT(*) as chunk_count
      FROM document_embeddings
      GROUP BY account_data_source_id
    ) chunks_per_doc ON de.account_data_source_id = chunks_per_doc.account_data_source_id
    WHERE (account_id_param IS NULL OR ads.account_id = account_id_param)
  )
  SELECT * FROM embedding_stats;
END;
$$;

-- Function to find documents similar to a specific document
CREATE OR REPLACE FUNCTION find_similar_documents_by_id(
  query_document_id UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  document_id UUID,
  file_name TEXT,
  similarity FLOAT,
  chunk_content TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Get a representative embedding for the query document
  SELECT de.embedding INTO query_embedding
  FROM document_embeddings de
  WHERE de.account_data_source_id = query_document_id
  ORDER BY de.created_at
  LIMIT 1;
  
  -- If no embedding found, return empty
  IF query_embedding IS NULL THEN
    RETURN;
  END IF;
  
  -- Find similar documents
  RETURN QUERY
  SELECT 
    de.account_data_source_id as document_id,
    ads.file_name,
    1 - (de.embedding <=> query_embedding) as similarity,
    de.content as chunk_content
  FROM document_embeddings de
  JOIN account_data_sources ads ON de.account_data_source_id = ads.id
  WHERE de.account_data_source_id != query_document_id
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$; 