-- PostPhantom Database Schema v1.1 - Context Embeddings Addition
-- DERIVED FROM: PostPhantom Database Design Specification v1.1
-- CRITICAL: Adds context_embeddings table for backward compatibility

-- Context Embeddings - General purpose embeddings for content similarity analysis
-- CRITICAL: Never stores user content or generated text - only embeddings and metadata
CREATE TABLE context_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  content_type TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}', -- Metadata only, never user content or generated text
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_content_type_general CHECK (content_type IN ('interaction', 'contact', 'topic', 'general')),
  CONSTRAINT non_empty_hash_general CHECK (length(content_hash) > 0)
);

-- Enable RLS
ALTER TABLE context_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "context_embeddings_user_access" ON context_embeddings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_context_embeddings_user_id ON context_embeddings(user_id);
CREATE INDEX idx_context_embeddings_content_type ON context_embeddings(content_type);
CREATE INDEX idx_context_embeddings_hash ON context_embeddings(content_hash);

-- HNSW index for fast similarity search on embeddings
CREATE INDEX idx_context_embeddings_vector ON context_embeddings 
USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Add to database service constants
-- Note: This table provides general-purpose embedding storage for backward compatibility
-- while the domain-specific embedding tables provide specialized functionality