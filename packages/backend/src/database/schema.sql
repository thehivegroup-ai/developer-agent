-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Conversation threads
CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_conversation_threads_user_id ON conversation_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_created_at ON conversation_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_threads_active ON conversation_threads(user_id, is_active);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);

-- Agent sessions
CREATE TABLE IF NOT EXISTS agent_sessions (
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

CREATE INDEX IF NOT EXISTS idx_agent_sessions_thread_id ON agent_sessions(thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status);

-- Agent state
CREATE TABLE IF NOT EXISTS agent_state (
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

CREATE INDEX IF NOT EXISTS idx_agent_state_session_id ON agent_state(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_state_agent_id ON agent_state(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_state_status ON agent_state(status);
CREATE INDEX IF NOT EXISTS idx_agent_state_ttl ON agent_state(ttl_expires_at);
CREATE INDEX IF NOT EXISTS idx_agent_state_repository ON agent_state(repository_name) WHERE repository_name IS NOT NULL;

-- Agent messages
CREATE TABLE IF NOT EXISTS agent_messages (
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

CREATE INDEX IF NOT EXISTS idx_agent_messages_session_id ON agent_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_messages_from_agent ON agent_messages(from_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_to_agent ON agent_messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_parent ON agent_messages(parent_message_id);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
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

CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_tasks_task_id ON tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Repository cache
CREATE TABLE IF NOT EXISTS repository_cache (
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

CREATE INDEX IF NOT EXISTS idx_repository_cache_full_name ON repository_cache(repository_full_name);
CREATE INDEX IF NOT EXISTS idx_repository_cache_owner ON repository_cache(owner);
CREATE INDEX IF NOT EXISTS idx_repository_cache_type ON repository_cache(detected_type);
CREATE INDEX IF NOT EXISTS idx_repository_cache_expires ON repository_cache(expires_at);

-- File cache
CREATE TABLE IF NOT EXISTS file_cache (
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

CREATE INDEX IF NOT EXISTS idx_file_cache_repository ON file_cache(repository_full_name);
CREATE INDEX IF NOT EXISTS idx_file_cache_path ON file_cache(repository_full_name, file_path);
CREATE INDEX IF NOT EXISTS idx_file_cache_expires ON file_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_file_cache_accessed ON file_cache(last_accessed_at);

-- Code embeddings
CREATE TABLE IF NOT EXISTS code_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_full_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  content TEXT NOT NULL,
  embedding vector(1536),
  model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-ada-002',
  start_line INTEGER,
  end_line INTEGER,
  language VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_code_embeddings_repository ON code_embeddings(repository_full_name);
CREATE INDEX IF NOT EXISTS idx_code_embeddings_file ON code_embeddings(repository_full_name, file_path);
CREATE INDEX IF NOT EXISTS idx_code_embeddings_vector ON code_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- LangGraph checkpoints
CREATE TABLE IF NOT EXISTS langgraph_checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  checkpoint_id VARCHAR(255) UNIQUE NOT NULL,
  parent_checkpoint_id VARCHAR(255),
  state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_session_id ON langgraph_checkpoints(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_checkpoints_checkpoint_id ON langgraph_checkpoints(checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_parent ON langgraph_checkpoints(parent_checkpoint_id);

-- Rate limit tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
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

CREATE INDEX IF NOT EXISTS idx_rate_limit_service ON rate_limit_tracking(service);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracking(service, window_start);
