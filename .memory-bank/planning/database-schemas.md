# Database Schemas

## Date
October 22, 2025

## Overview
This document defines the database schemas for both PostgreSQL and Neo4j. PostgreSQL handles conversations, embeddings, and cache, while Neo4j stores the knowledge graph of repository relationships.

---

## PostgreSQL Schema

### Database Configuration
- **Database Name**: `a2a_agents`
- **Extensions Required**:
  - `pgvector` - Vector similarity search
  - `uuid-ossp` - UUID generation

### Tables

#### 1. users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_username ON users(username);
```

#### 2. conversation_threads
```sql
CREATE TABLE conversation_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_conversation_threads_user_id ON conversation_threads(user_id);
CREATE INDEX idx_conversation_threads_created_at ON conversation_threads(created_at DESC);
CREATE INDEX idx_conversation_threads_active ON conversation_threads(user_id, is_active);
```

#### 3. messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX idx_messages_thread_id ON messages(thread_id, created_at);
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
```

#### 4. agent_sessions
```sql
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  state JSONB NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT
);

CREATE INDEX idx_agent_sessions_thread_id ON agent_sessions(thread_id);
CREATE INDEX idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
```

#### 5. agent_state
```sql
CREATE TABLE agent_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('developer', 'github', 'repository', 'relationship')),
  repository_type VARCHAR(50) CHECK (repository_type IN ('csharp-api', 'csharp-library', 'node-api', 'react', 'angular')),
  repository_name VARCHAR(255),
  state JSONB NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('idle', 'busy', 'waiting', 'error', 'destroyed')),
  spawned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ttl_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_agent_state_session_id ON agent_state(session_id);
CREATE INDEX idx_agent_state_agent_id ON agent_state(agent_id);
CREATE INDEX idx_agent_state_status ON agent_state(status);
CREATE INDEX idx_agent_state_ttl ON agent_state(ttl_expires_at);
CREATE INDEX idx_agent_state_repository ON agent_state(repository_name) WHERE repository_name IS NOT NULL;
```

#### 6. agent_messages
```sql
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  message_id VARCHAR(255) UNIQUE NOT NULL,
  from_agent_id VARCHAR(255) NOT NULL,
  to_agent_id VARCHAR(255) NOT NULL,
  message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('request', 'response', 'notification', 'error')),
  content TEXT NOT NULL,
  parent_message_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_agent_messages_session_id ON agent_messages(session_id, created_at);
CREATE INDEX idx_agent_messages_from_agent ON agent_messages(from_agent_id);
CREATE INDEX idx_agent_messages_to_agent ON agent_messages(to_agent_id);
CREATE INDEX idx_agent_messages_parent ON agent_messages(parent_message_id);
```

#### 7. tasks
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  task_id VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  assigned_to VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in-progress', 'completed', 'failed', 'blocked')),
  priority INTEGER DEFAULT 0,
  dependencies JSONB DEFAULT '[]'::jsonb,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_tasks_session_id ON tasks(session_id);
CREATE INDEX idx_tasks_task_id ON tasks(task_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
```

#### 8. repository_cache
```sql
CREATE TABLE repository_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_full_name VARCHAR(255) UNIQUE NOT NULL,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  detected_type VARCHAR(50),
  detection_confidence DECIMAL(3, 2),
  default_branch VARCHAR(255) DEFAULT 'main',
  primary_language VARCHAR(100),
  languages JSONB DEFAULT '{}'::jsonb,
  size_kb INTEGER,
  topics JSONB DEFAULT '[]'::jsonb,
  structure JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_updated TIMESTAMP WITH TIME ZONE,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_repository_cache_full_name ON repository_cache(repository_full_name);
CREATE INDEX idx_repository_cache_owner ON repository_cache(owner);
CREATE INDEX idx_repository_cache_type ON repository_cache(detected_type);
CREATE INDEX idx_repository_cache_expires ON repository_cache(expires_at);
```

#### 9. file_cache
```sql
CREATE TABLE file_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_full_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  content TEXT NOT NULL,
  sha VARCHAR(40) NOT NULL,
  size_bytes INTEGER NOT NULL,
  language VARCHAR(100),
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(repository_full_name, file_path)
);

CREATE INDEX idx_file_cache_repository ON file_cache(repository_full_name);
CREATE INDEX idx_file_cache_path ON file_cache(repository_full_name, file_path);
CREATE INDEX idx_file_cache_expires ON file_cache(expires_at);
CREATE INDEX idx_file_cache_accessed ON file_cache(last_accessed_at);
```

#### 10. code_embeddings
```sql
CREATE TABLE code_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_full_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI ada-002 dimensions
  model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-ada-002',
  start_line INTEGER,
  end_line INTEGER,
  language VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_code_embeddings_repository ON code_embeddings(repository_full_name);
CREATE INDEX idx_code_embeddings_file ON code_embeddings(repository_full_name, file_path);
CREATE INDEX idx_code_embeddings_vector ON code_embeddings USING ivfflat (embedding vector_cosine_ops);
```

#### 11. langgraph_checkpoints
```sql
CREATE TABLE langgraph_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  checkpoint_id VARCHAR(255) UNIQUE NOT NULL,
  parent_checkpoint_id VARCHAR(255),
  state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_checkpoints_session_id ON langgraph_checkpoints(session_id, created_at);
CREATE INDEX idx_checkpoints_checkpoint_id ON langgraph_checkpoints(checkpoint_id);
CREATE INDEX idx_checkpoints_parent ON langgraph_checkpoints(parent_checkpoint_id);
```

#### 12. rate_limit_tracking
```sql
CREATE TABLE rate_limit_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service VARCHAR(50) NOT NULL CHECK (service IN ('github', 'openai')),
  endpoint VARCHAR(255),
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  request_count INTEGER DEFAULT 0,
  limit_total INTEGER NOT NULL,
  limit_remaining INTEGER NOT NULL,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('ok', 'warning', 'critical')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rate_limit_service ON rate_limit_tracking(service);
CREATE INDEX idx_rate_limit_window ON rate_limit_tracking(service, window_start);
```

### Cleanup Jobs

```sql
-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Delete old inactive conversation threads (older than 90 days)
  DELETE FROM conversation_threads 
  WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '90 days';
  
  -- Delete old completed sessions (older than 7 days)
  DELETE FROM agent_sessions 
  WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '7 days';
  
  -- Delete old failed sessions (older than 30 days)
  DELETE FROM agent_sessions 
  WHERE status = 'failed' 
    AND updated_at < NOW() - INTERVAL '30 days';
  
  -- Delete expired cache entries
  DELETE FROM repository_cache WHERE expires_at < NOW();
  DELETE FROM file_cache WHERE expires_at < NOW();
  
  -- Delete expired agent states
  DELETE FROM agent_state WHERE ttl_expires_at < NOW();
  
  -- Archive old agent messages (keep last 30 days per session)
  DELETE FROM agent_messages 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

---

## Neo4j Schema

### Database Configuration
- **Database Name**: `a2a_agents`
- **Version**: 5.x or higher

### Node Labels

#### 1. Repository
```cypher
CREATE CONSTRAINT repository_unique_name IF NOT EXISTS
FOR (r:Repository) REQUIRE r.fullName IS UNIQUE;

// Properties:
// - fullName: STRING (required, unique)
// - owner: STRING (required)
// - name: STRING (required)
// - type: STRING (csharp-api, csharp-library, node-api, react, angular)
// - description: STRING
// - primaryLanguage: STRING
// - topics: LIST<STRING>
// - size: INTEGER
// - lastUpdated: DATETIME
// - createdAt: DATETIME
// - metadata: MAP
```

#### 2. Package
```cypher
CREATE CONSTRAINT package_unique_id IF NOT EXISTS
FOR (p:Package) REQUIRE p.packageId IS UNIQUE;

// Properties:
// - packageId: STRING (required, unique) - format: "type:name@version"
// - name: STRING (required)
// - version: STRING (required)
// - type: STRING (npm, nuget)
// - description: STRING
// - registry: STRING
// - createdAt: DATETIME
// - metadata: MAP
```

#### 3. API
```cypher
CREATE CONSTRAINT api_unique_id IF NOT EXISTS
FOR (a:API) REQUIRE a.apiId IS UNIQUE;

// Properties:
// - apiId: STRING (required, unique) - format: "repo:path:method"
// - repository: STRING (required)
// - path: STRING (required)
// - method: STRING (GET, POST, PUT, DELETE, etc.)
// - description: STRING
// - isPublic: BOOLEAN
// - version: STRING
// - createdAt: DATETIME
// - metadata: MAP
```

#### 4. Service
```cypher
CREATE CONSTRAINT service_unique_name IF NOT EXISTS
FOR (s:Service) REQUIRE s.name IS UNIQUE;

// Properties:
// - name: STRING (required, unique)
// - type: STRING (api, web, worker, etc.)
// - description: STRING
// - repositories: LIST<STRING>
// - createdAt: DATETIME
// - metadata: MAP
```

### Relationship Types

#### 1. DEPENDS_ON
```cypher
// Repository -> Package
// Properties:
// - type: STRING (direct, dev, optional)
// - versionConstraint: STRING
// - discoveredAt: DATETIME
// - source: STRING (package.json, .csproj, etc.)
```

#### 2. DEPENDS_ON_TRANSITIVE
```cypher
// Repository -> Package (indirect)
// Properties:
// - depth: INTEGER (how many hops)
// - path: LIST<STRING> (dependency chain)
// - discoveredAt: DATETIME
```

#### 3. CONSUMES_API
```cypher
// Repository -> API
// Properties:
// - frequency: STRING (high, medium, low)
// - discoveredAt: DATETIME
// - confidence: FLOAT (0.0 to 1.0)
// - examples: LIST<STRING> (code locations)
```

#### 4. PROVIDES_API
```cypher
// Repository -> API
// Properties:
// - isMain: BOOLEAN
// - version: STRING
// - discoveredAt: DATETIME
```

#### 5. SHARES_PACKAGE
```cypher
// Repository -> Repository (via common package)
// Properties:
// - packageName: STRING
// - packageVersion: STRING
// - sharedCount: INTEGER
// - discoveredAt: DATETIME
```

#### 6. PART_OF
```cypher
// Repository -> Service
// Properties:
// - role: STRING (primary, secondary, support)
// - addedAt: DATETIME
```

### Indexes

```cypher
// Performance indexes
CREATE INDEX repository_type IF NOT EXISTS FOR (r:Repository) ON (r.type);
CREATE INDEX repository_owner IF NOT EXISTS FOR (r:Repository) ON (r.owner);
CREATE INDEX repository_language IF NOT EXISTS FOR (r:Repository) ON (r.primaryLanguage);

CREATE INDEX package_type IF NOT EXISTS FOR (p:Package) ON (p.type);
CREATE INDEX package_name IF NOT EXISTS FOR (p:Package) ON (p.name);

CREATE INDEX api_repository IF NOT EXISTS FOR (a:API) ON (a.repository);
CREATE INDEX api_method IF NOT EXISTS FOR (a:API) ON (a.method);

CREATE INDEX service_type IF NOT EXISTS FOR (s:Service) ON (s.type);
```

### Common Queries

#### Find all dependencies of a repository
```cypher
MATCH (r:Repository {fullName: $repoName})-[:DEPENDS_ON]->(p:Package)
RETURN r, p;
```

#### Find transitive dependencies
```cypher
MATCH path = (r:Repository {fullName: $repoName})-[:DEPENDS_ON*1..5]->(p:Package)
RETURN path;
```

#### Find repositories that share packages
```cypher
MATCH (r1:Repository)-[:DEPENDS_ON]->(p:Package)<-[:DEPENDS_ON]-(r2:Repository)
WHERE r1.fullName = $repoName AND r1 <> r2
RETURN r1, p, r2;
```

#### Find API consumers
```cypher
MATCH (r:Repository)-[:CONSUMES_API]->(a:API)
WHERE a.repository = $repoName
RETURN r, a;
```

#### Find all relationships for a repository
```cypher
MATCH (r:Repository {fullName: $repoName})
OPTIONAL MATCH (r)-[rel]->(target)
RETURN r, rel, target;
```

#### Find dependency paths between two repositories
```cypher
MATCH path = shortestPath(
  (r1:Repository {fullName: $repo1})-[*]-(r2:Repository {fullName: $repo2})
)
RETURN path;
```

### Graph Maintenance

```cypher
// Remove orphaned nodes (no relationships)
MATCH (n)
WHERE NOT (n)--()
DELETE n;

// Update last analyzed timestamp
MATCH (r:Repository {fullName: $repoName})
SET r.lastAnalyzed = datetime();

// Merge or create relationship (idempotent)
MERGE (r:Repository {fullName: $repoName})
MERGE (p:Package {packageId: $packageId})
MERGE (r)-[d:DEPENDS_ON {type: $depType}]->(p)
ON CREATE SET d.discoveredAt = datetime()
ON MATCH SET d.updatedAt = datetime();
```

---

## Database Connection Configuration

### PostgreSQL Connection String Format
```
postgresql://username:password@host:port/database?options
```

### Neo4j Connection String Format
```
neo4j://username:password@host:port
```

### Environment Variables (.env.local)
```bash
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=a2a_user
POSTGRES_PASSWORD=secure_password
POSTGRES_DB=a2a_agents

# Neo4j
NEO4J_URI=neo4j://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=secure_password
NEO4J_DATABASE=a2a_agents
```

---

## Migration Strategy

### Initial Setup
1. Create PostgreSQL database and enable extensions
2. Run all table creation scripts in order
3. Create indexes
4. Set up Neo4j database
5. Create constraints and indexes in Neo4j

### Version Control
- Use migration tool (e.g., `node-pg-migrate` for PostgreSQL)
- Version all schema changes
- Maintain rollback scripts
- Test migrations on staging before production

### Backup Strategy
- PostgreSQL: Daily full backups, hourly incremental
- Neo4j: Daily full backups
- Keep backups for 30 days
- Test restore procedures monthly

---

*Last Updated: October 22, 2025*
