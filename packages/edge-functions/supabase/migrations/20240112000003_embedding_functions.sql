-- Embedding similarity search functions for PostPhantom

-- Function to find similar embeddings using cosine similarity
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content_hash text,
  content_type text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ce.id,
    ce.user_id,
    ce.content_hash,
    ce.content_type,
    ce.embedding,
    ce.metadata,
    ce.created_at,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM context_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to find similar embeddings for a specific user
CREATE OR REPLACE FUNCTION match_user_embeddings(
  user_id_param uuid,
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10,
  content_type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  content_hash text,
  content_type text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    ce.id,
    ce.user_id,
    ce.content_hash,
    ce.content_type,
    ce.embedding,
    ce.metadata,
    ce.created_at,
    1 - (ce.embedding <=> query_embedding) AS similarity
  FROM context_embeddings ce
  WHERE ce.user_id = user_id_param
    AND 1 - (ce.embedding <=> query_embedding) > similarity_threshold
    AND (content_type_filter IS NULL OR ce.content_type = content_type_filter)
  ORDER BY ce.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to get embedding statistics for a user
CREATE OR REPLACE FUNCTION get_user_embedding_stats(user_id_param uuid)
RETURNS TABLE (
  total_embeddings bigint,
  embeddings_by_type jsonb,
  oldest_embedding timestamptz,
  newest_embedding timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) as total_embeddings,
    jsonb_object_agg(content_type, type_count) as embeddings_by_type,
    MIN(created_at) as oldest_embedding,
    MAX(created_at) as newest_embedding
  FROM (
    SELECT 
      content_type,
      COUNT(*) as type_count,
      created_at
    FROM context_embeddings
    WHERE user_id = user_id_param
    GROUP BY content_type, created_at
  ) stats;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION match_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION match_user_embeddings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_embedding_stats TO authenticated;