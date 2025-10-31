import { getPgPool } from './postgres.js';
import { EnvConfigSchema } from '../config.js';
import type { Pool, QueryResult } from 'pg';

/**
 * Helper to execute queries
 */
async function query(pool: Pool, text: string, params: unknown[]): Promise<QueryResult> {
  const result = await pool.query(text, params);
  return result;
}

/**
 * Generate an embedding vector for the given text using OpenAI's API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const env = EnvConfigSchema.parse(process.env);

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return data.data[0]!.embedding;
}

/**
 * Store an embedding in the database
 */
export async function storeEmbedding(params: {
  repositoryName: string;
  repositoryOwner: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
}): Promise<void> {
  const { repositoryName, repositoryOwner, content, metadata, embedding } = params;
  const pool = getPgPool();

  // Create a hash of the content for deduplication
  const crypto = await import('crypto');
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');

  // Store repository-level embedding using metadata path
  const filePath = 'metadata'; // Special path for repository metadata embeddings

  await query(
    pool,
    `INSERT INTO repository_embeddings (
      repository_name, 
      repository_owner, 
      file_path,
      content,
      content_hash,
      metadata,
      embedding
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (repository_name, file_path) 
    DO UPDATE SET 
      repository_owner = EXCLUDED.repository_owner,
      content = EXCLUDED.content,
      content_hash = EXCLUDED.content_hash,
      metadata = EXCLUDED.metadata,
      embedding = EXCLUDED.embedding,
      updated_at = NOW()`,
    [
      repositoryName,
      repositoryOwner,
      filePath,
      content,
      contentHash,
      JSON.stringify(metadata),
      JSON.stringify(embedding),
    ]
  );
}

/**
 * Search result type
 */
export interface SearchResult {
  id: number;
  repositoryName: string;
  repositoryOwner: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * Database row type for search results
 */
interface SearchResultRow {
  id: number;
  repository_name: string;
  repository_owner: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: string;
}

/**
 * Search for similar repositories using vector similarity
 */
export async function searchSimilarRepositories(
  queryText: string,
  limit: number = 5
): Promise<SearchResult[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText);

  const pool = getPgPool();

  // Use cosine similarity to find most similar repositories
  // Formula: 1 - (embedding <=> query_embedding) gives similarity score (higher = more similar)
  const result = await query(
    pool,
    `SELECT 
      id,
      repository_name,
      repository_owner,
      content,
      metadata,
      1 - (embedding <=> $1::vector) AS similarity
    FROM repository_embeddings
    WHERE file_path = 'metadata'
    ORDER BY embedding <=> $1::vector
    LIMIT $2`,
    [JSON.stringify(queryEmbedding), limit]
  );

  return (result.rows as SearchResultRow[]).map((row) => ({
    id: row.id,
    repositoryName: row.repository_name,
    repositoryOwner: row.repository_owner,
    content: row.content,
    metadata: row.metadata,
    similarity: parseFloat(row.similarity),
  }));
}
