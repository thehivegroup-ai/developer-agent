-- Migration: Create repository_embeddings table for semantic search
-- Requires: pgvector extension

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Repository embeddings table
-- Stores code embeddings for semantic search across repositories
CREATE TABLE IF NOT EXISTS repository_embeddings (
  id SERIAL PRIMARY KEY,
  repository_name VARCHAR(255) NOT NULL,
  repository_owner VARCHAR(255),
  file_path TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for deduplication
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}', -- Additional metadata (language, framework, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure unique entries per repository and file
  UNIQUE(repository_name, file_path)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_repo_embeddings_repo_name 
  ON repository_embeddings(repository_name);

CREATE INDEX IF NOT EXISTS idx_repo_embeddings_owner 
  ON repository_embeddings(repository_owner);

CREATE INDEX IF NOT EXISTS idx_repo_embeddings_file_path 
  ON repository_embeddings USING gin(to_tsvector('english', file_path));

CREATE INDEX IF NOT EXISTS idx_repo_embeddings_content_hash 
  ON repository_embeddings(content_hash);

CREATE INDEX IF NOT EXISTS idx_repo_embeddings_metadata 
  ON repository_embeddings USING gin(metadata);

-- Vector similarity search index (IVFFlat for approximate nearest neighbor)
-- Lists parameter: sqrt(total_rows) is a good starting point
-- Adjust based on dataset size
CREATE INDEX IF NOT EXISTS idx_repo_embeddings_vector 
  ON repository_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_repo_embeddings_updated_at
  BEFORE UPDATE ON repository_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE repository_embeddings IS 'Stores code embeddings for semantic search across repositories';
COMMENT ON COLUMN repository_embeddings.embedding IS 'OpenAI text-embedding-3-small vector (1536 dimensions)';
COMMENT ON COLUMN repository_embeddings.metadata IS 'Additional metadata like language, framework, dependencies';
COMMENT ON COLUMN repository_embeddings.content_hash IS 'SHA-256 hash for deduplication and change detection';
