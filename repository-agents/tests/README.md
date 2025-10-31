# Node API Agent End-to-End Test

This test verifies the complete workflow of the Node API Agent, from repository analysis to semantic search.

## What This Test Does

1. **Database Setup** - Initializes PostgreSQL and runs migrations
2. **GitHub Integration** - Fetches repository metadata using GitHub Agent
3. **Repository Analysis** - Analyzes a Node.js repository (express.js by default)
4. **Dependency Extraction** - Parses package.json and categorizes dependencies
5. **Embedding Generation** - Creates OpenAI embeddings for code files
6. **Database Storage** - Stores embeddings in PostgreSQL with pgvector
7. **Semantic Search** - Performs similarity searches on the embedded code

## Prerequisites

1. **PostgreSQL with pgvector** - Required for vector similarity search

   ```bash
   # Using Docker (recommended)
   docker run -d \
     --name postgres-pgvector \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=developer_agent \
     -p 5432:5432 \
     pgvector/pgvector:pg16
   ```

2. **Environment Variables** - Copy `.env.template` to `.env` and fill in:

   ```bash
   # PostgreSQL
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=your_password
   POSTGRES_DB=developer_agent

   # OpenAI (required for embeddings)
   OPENAI_API_KEY=your_openai_api_key

   # GitHub (optional, but recommended for higher rate limits)
   GITHUB_TOKEN=your_github_token
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

## Running the Test

```bash
# From the repository-agents directory
npm run test:e2e

# Or from project root
npm run test:e2e --workspace=@developer-agent/repository-agents
```

## Expected Output

The test will display progress through each step:

```
🧪 Starting Node API Agent End-to-End Test

═══════════════════════════════════════════════════════════

📦 Step 1: Database Setup
────────────────────────────────────────────────────────────
Running migrations...
✅ Database ready

📦 Step 2: Initialize GitHub Agent
────────────────────────────────────────────────────────────
✅ GitHub Agent initialized

📦 Step 3: Fetch Repository Metadata
────────────────────────────────────────────────────────────
Fetching expressjs/express...
✅ Repository: express
   Description: Fast, unopinionated, minimalist web framework
   Language: JavaScript
   Stars: 64000
   Type: node-api

📦 Step 4: Initialize Node API Agent
────────────────────────────────────────────────────────────
✅ Node API Agent initialized

📦 Step 5: Analyze Repository
────────────────────────────────────────────────────────────
This may take a minute - generating embeddings...

✅ Analysis complete!
   Dependencies found: 32
   Framework: express
   Embeddings generated: 15

   Top dependencies:
   - body-parser (middleware)
   - cookie-parser (middleware)
   - debug (utility)
   - methods (utility)
   - path-to-regexp (routing)

📦 Step 6: Semantic Search Test
────────────────────────────────────────────────────────────

🔍 Searching for: "middleware function"
   Found 3 results:
   1. lib/middleware/init.js (similarity: 0.892)
      exports = module.exports = function middleware(req, res, next) {...
   2. lib/application.js (similarity: 0.856)
      app.use = function use(fn) { var mount_path = '/';...
   3. lib/router/index.js (similarity: 0.834)
      proto.use = function use(fn) { var offset = 0;...

📦 Step 7: Database Verification
────────────────────────────────────────────────────────────
✅ Embeddings in database: 15
   Sample file: lib/application.js
   Metadata: {"language":"javascript","framework":"express"}
   Created: 2025-10-30T12:34:56.789Z

═══════════════════════════════════════════════════════════
✅ ALL TESTS PASSED!
═══════════════════════════════════════════════════════════

📊 Test Summary:
   ✅ Database setup: OK
   ✅ GitHub Agent: OK
   ✅ Repository analysis: OK
   ✅ Embedding generation: OK
   ✅ Database storage: OK (15 embeddings)
   ✅ Semantic search: OK
   ⏱️  Duration: 45.23s

🧹 Cleaning up...
✅ Test complete

👋 Goodbye!
```

## What Gets Tested

### ✅ Database Operations

- Connection to PostgreSQL
- Migration execution
- pgvector extension
- Table creation with indexes

### ✅ GitHub Integration

- Repository metadata fetching
- Repository type detection
- API rate limiting

### ✅ Code Analysis

- package.json parsing
- Dependency extraction and categorization
- Framework detection
- File structure traversal

### ✅ Embedding Generation

- OpenAI API integration
- Text embedding creation (1536 dimensions)
- Batch processing

### ✅ Vector Storage

- PostgreSQL insert with pgvector
- Deduplication by content hash
- Metadata storage (JSONB)

### ✅ Semantic Search

- Vector similarity queries
- Cosine similarity ranking
- Result retrieval and formatting

## Troubleshooting

### Error: "Cannot connect to database"

- Check PostgreSQL is running: `docker ps` or `pg_isready`
- Verify `.env` has correct database credentials
- Test connection: `psql -h localhost -U postgres -d developer_agent`

### Error: "extension 'vector' does not exist"

- You need pgvector extension installed
- Use the pgvector Docker image (recommended)
- Or install from source: https://github.com/pgvector/pgvector

### Error: "OpenAI API key not found"

- Set `OPENAI_API_KEY` in `.env`
- Get an API key from: https://platform.openai.com/api-keys

### Error: "GitHub rate limit exceeded"

- Set `GITHUB_TOKEN` in `.env` for higher rate limits
- Wait for rate limit to reset (typically 1 hour)
- Use a different test repository with fewer files

### Test Takes Too Long

- The test analyzes a real repository and generates embeddings
- Expected duration: 30-60 seconds depending on:
  - Repository size
  - OpenAI API response time
  - Database performance
- To test with a smaller repository, edit `test-node-api-agent.ts`:
  ```typescript
  const TEST_REPO_OWNER = 'koajs';
  const TEST_REPO_NAME = 'koa'; // Smaller than express
  ```

## Cleanup

To remove test data from the database:

```bash
# Remove all embeddings for the test repository
psql -h localhost -U postgres -d developer_agent -c \
  "DELETE FROM repository_embeddings WHERE repository_name = 'express';"

# Or reset the entire database
npm run db:setup --workspace=@developer-agent/shared
```

## Next Steps

After the test passes:

1. Try analyzing other repositories
2. Experiment with different semantic search queries
3. Integrate with the Developer Agent orchestrator
4. Build the LangGraph workflows
5. Create the React frontend for user interaction
