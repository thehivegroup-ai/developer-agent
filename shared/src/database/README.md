# Database Setup

This directory contains database migrations and utilities for the Developer Agent system.

## Quick Start

1. **Ensure PostgreSQL is running** with pgvector extension available

2. **Set up environment variables** (copy `.env.template` to `.env` in project root):

   ```bash
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=yourpassword
   POSTGRES_DB=developer_agent
   ```

3. **Run database setup**:

   ```bash
   npm run db:setup --workspace=@developer-agent/shared
   ```

   This will:
   - Test the database connection
   - Enable the pgvector extension
   - Create the `repository_embeddings` table
   - Set up indexes for semantic search

## Tables Created

### `repository_embeddings`

Stores code embeddings for semantic search across repositories.

| Column             | Type         | Description                                     |
| ------------------ | ------------ | ----------------------------------------------- |
| `id`               | SERIAL       | Primary key                                     |
| `repository_name`  | VARCHAR(255) | Repository name (e.g., "express")               |
| `repository_owner` | VARCHAR(255) | Repository owner (e.g., "expressjs")            |
| `file_path`        | TEXT         | Path to file within repository                  |
| `content`          | TEXT         | File content/code snippet                       |
| `content_hash`     | VARCHAR(64)  | SHA-256 hash for deduplication                  |
| `embedding`        | vector(1536) | OpenAI text-embedding-3-small vector            |
| `metadata`         | JSONB        | Additional metadata (language, framework, etc.) |
| `created_at`       | TIMESTAMP    | Creation timestamp                              |
| `updated_at`       | TIMESTAMP    | Last update timestamp                           |

**Indexes:**

- `idx_repo_embeddings_repo_name` - Fast lookup by repository name
- `idx_repo_embeddings_owner` - Fast lookup by owner
- `idx_repo_embeddings_file_path` - Full-text search on file paths
- `idx_repo_embeddings_content_hash` - Deduplication
- `idx_repo_embeddings_metadata` - JSONB queries
- `idx_repo_embeddings_vector` - Vector similarity search (IVFFlat)

## Manual Migration Commands

**Run migrations:**

```bash
npm run db:migrate --workspace=@developer-agent/shared
```

**Rollback last migration:**

```bash
npm run db:migrate:down --workspace=@developer-agent/shared
```

## Using in Code

```typescript
import { getPgPool, testPgConnection, query } from '@developer-agent/shared';

// Get connection pool
const pool = getPgPool();

// Test connection
const isConnected = await testPgConnection();

// Execute queries
const results = await query('SELECT * FROM repository_embeddings LIMIT 10');
```

## Semantic Search Query Example

```sql
-- Find similar code snippets using cosine similarity
SELECT
  repository_name,
  file_path,
  content,
  1 - (embedding <=> $1::vector) as similarity
FROM repository_embeddings
WHERE repository_name = 'express'
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

Where `$1` is your query embedding vector.

## Adding New Migrations

1. Create a new SQL file in `migrations/` with sequential numbering:

   ```
   002_add_repository_metadata_table.sql
   ```

2. Add the migration filename to the `migrations` array in `migrate.ts`

3. Run migrations:
   ```bash
   npm run db:migrate --workspace=@developer-agent/shared
   ```

## pgvector Installation

If pgvector is not installed on your PostgreSQL instance:

### Using Docker (Recommended)

```bash
docker run -d \
  --name postgres-pgvector \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=developer_agent \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### From Source

```bash
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

Then in PostgreSQL:

```sql
CREATE EXTENSION vector;
```

## Troubleshooting

**Error: "extension 'vector' does not exist"**

- Install pgvector extension (see above)
- Ensure you have PostgreSQL 11 or higher

**Error: "connection refused"**

- Check PostgreSQL is running: `pg_isready`
- Verify connection settings in `.env`

**Error: "permission denied"**

- Ensure your database user has CREATE privileges
- Try connecting as superuser first to enable extensions

## Database Reset (Development Only)

To completely reset the database:

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS developer_agent;"
psql -U postgres -c "CREATE DATABASE developer_agent;"

# Run setup
npm run db:setup --workspace=@developer-agent/shared
```
