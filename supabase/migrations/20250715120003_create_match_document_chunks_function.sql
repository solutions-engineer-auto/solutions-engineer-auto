/**
 * Creates a Supabase RPC function to match document chunks using vector similarity search.
 * This function is used by the agent to retrieve relevant context for document generation.
 */
CREATE OR REPLACE FUNCTION match_document_chunks (
  p_account_id UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.content,
    1 - (de.embedding <=> query_embedding) AS similarity
  FROM
    document_embeddings de
  JOIN
    account_data_sources ads ON de.account_data_source_id = ads.id
  WHERE
    ads.account_id = p_account_id AND (1 - (de.embedding <=> query_embedding)) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$; 