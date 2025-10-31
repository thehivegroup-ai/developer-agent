# Developer Agent Integration Tests

This directory contains end-to-end integration tests for the Developer Agent orchestration system.

## Test: Agent Integration (`test-agent-integration.ts`)

This test validates the complete agent coordination workflow from query to results.

### What It Tests

1. **Database Setup** - Runs migrations, creates tables with pgvector extension
2. **Developer Agent Initialization** - Spawns the central orchestrator
3. **Query Processing** - Processes a natural language query
4. **Task Decomposition** - Breaks query into subtasks (GitHub discovery, repository analysis)
5. **Agent Spawning** - Dynamically creates GitHub Agent and Node API Agent
6. **Agent Coordination** - Executes tasks in dependency order
7. **Result Persistence** - Stores embeddings in PostgreSQL with pgvector
8. **State Checkpointing** - Saves system state for recovery

### Prerequisites

1. **PostgreSQL with pgvector**

   ```bash
   docker run -d \
     --name postgres-dev \
     -e POSTGRES_USER=developer_agent \
     -e POSTGRES_PASSWORD=dev_password \
     -e POSTGRES_DB=developer_agent \
     -p 5432:5432 \
     ankane/pgvector:latest
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory:

   ```env
   # PostgreSQL
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=developer_agent
   POSTGRES_PASSWORD=dev_password
   POSTGRES_DB=developer_agent

   # GitHub API
   GITHUB_TOKEN=your_github_token_here

   # OpenAI API
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Dependencies Installed**
   ```bash
   npm install
   ```

### Running the Test

```bash
# From workspace root
npm run test:integration --workspace=@developer-agent/developer-agent

# Or directly
cd developer-agent
npm run test:integration
```

### Expected Output

```
🚀 Starting Developer Agent Integration Test

📦 Step 1: Setting up database...
🔄 Running database migrations...
✅ Migration 001_create_embeddings_table.sql applied
✅ Database connected: { test: 1 }

🤖 Step 2: Initializing Developer Agent...
✅ Developer Agent initialized
   Agent ID: dev-agent-abc123
   Agent Type: developer

🔍 Step 3: Processing query...
   Query: "Find Express.js repositories and analyze their code structure"
   User ID: test-user-001
   Thread ID: test-thread-001

⏳ Processing... (this may take 30-60 seconds)
✅ GitHub Agent initialized
🔍 Searching for repositories: Find Express.js repositories...
✅ Found 5 repositories
✅ Node API Agent initialized for expressjs/express
🔍 Analyzing repository: expressjs/express
✅ Fetched 25 files
✅ Generated 25 embeddings
✅ Stored embeddings in database

✅ Query processed successfully!
   Session ID: session-xyz789
   Status: completed

🔎 Step 4: Verifying results...
✅ Found 2 result(s):

   Result 1:
   - Agent Type: github
   - Agent ID: github-agent-abc
   - Data: { repositories: [...] }

   Result 2:
   - Agent Type: repository
   - Agent ID: repo-agent-xyz
   - Data: { framework: "express", dependencies: [...] }

📊 Step 5: Verifying database embeddings...
✅ Found 25 embedding(s) in database
   Sample:
   - Repository: expressjs/express
   - File: lib/application.js

═══════════════════════════════════════════════════════════
✨ Integration Test PASSED
⏱️  Duration: 45.32s
═══════════════════════════════════════════════════════════

📋 Summary:
   ✅ Database setup complete
   ✅ Developer Agent initialized
   ✅ Query processed successfully
   ✅ GitHub Agent spawned and executed
   ✅ Repository Agent spawned and executed
   ✅ Results persisted to database
   ✅ State checkpointed

🧹 Cleaning up...
✅ Developer Agent shut down
✅ Database connections closed
```

### Test Duration

- **Fast Path** (cached): ~5-10 seconds
- **Normal Path**: ~30-45 seconds
- **Slow Path** (many files): ~60-90 seconds

Duration depends on:

- GitHub API response time
- OpenAI embedding generation speed
- Number of files in repository
- Database insert performance

### Troubleshooting

#### Error: "Connection refused" (PostgreSQL)

**Solution**: Ensure PostgreSQL is running

```bash
docker ps | grep postgres
# If not running:
docker start postgres-dev
```

#### Error: "pgvector extension not found"

**Solution**: Use the pgvector Docker image

```bash
docker run -d ankane/pgvector:latest ...
```

#### Error: "GitHub API rate limit"

**Solution**: Add GITHUB_TOKEN to `.env`

- Create token: https://github.com/settings/tokens
- Needs `public_repo` scope
- Rate limit: 5,000/hour (authenticated) vs 60/hour (unauthenticated)

#### Error: "OpenAI API key invalid"

**Solution**: Check OPENAI_API_KEY in `.env`

- Get key: https://platform.openai.com/api-keys
- Ensure account has credits

#### Error: "Cannot find module '@developer-agent/...'"

**Solution**: Build all workspace packages

```bash
npm run build --workspaces
```

#### Test Hangs on "Processing..."

**Possible Causes**:

1. GitHub API timeout - check network connection
2. OpenAI API timeout - check API key and credits
3. Large repository - may take 60-90 seconds

**Debug**:

```bash
# Add verbose logging
DEBUG=* npm run test:integration --workspace=@developer-agent/developer-agent
```

### Cleanup

```bash
# Stop PostgreSQL
docker stop postgres-dev

# Remove container (CAUTION: deletes data)
docker rm postgres-dev

# Clear database (keeps container)
docker exec -it postgres-dev psql -U developer_agent -d developer_agent -c "DROP TABLE IF EXISTS repository_embeddings, schema_migrations CASCADE;"
```

## Test Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Integration Test                      │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Developer Agent                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ processQuery() → decomposeQuery()                │  │
│  │                  → coordinateAgents()            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                           │
           ▼                           ▼
┌──────────────────┐        ┌─────────────────────────┐
│  GitHub Agent    │        │  Repository Agent       │
│                  │        │  (Node API)             │
│  - Discovery     │        │  - Code Analysis        │
│  - Type Detection│        │  - Embeddings           │
└──────────────────┘        │  - Semantic Search      │
           │                └─────────────────────────┘
           │                           │
           ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│               PostgreSQL with pgvector                   │
│  - repository_embeddings table                          │
│  - Vector similarity search (IVFFlat)                   │
│  - State checkpoints                                    │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

After successful integration test:

1. **Add More Tests**
   - Test error handling and recovery
   - Test agent timeout scenarios
   - Test concurrent query processing
   - Test checkpoint restoration

2. **LangGraph Integration**
   - Replace manual coordination with LangGraph workflows
   - Add state transitions
   - Add conditional edges
   - Add human-in-the-loop

3. **Additional Repository Agents**
   - Test React agent integration
   - Test Angular agent integration
   - Test C# API agent integration

4. **Performance Testing**
   - Benchmark query processing time
   - Test with large repositories (1000+ files)
   - Test concurrent agent spawning
   - Optimize database queries

5. **UI Integration**
   - Connect frontend to API Gateway
   - Display real-time agent status
   - Show task progress
   - Visualize agent graph
