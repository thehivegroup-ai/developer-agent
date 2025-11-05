-- Migration: Create tables for chat/conversation system
-- Creates users, conversations, and messages tables

-- Users table
-- Simple username-based identification (no passwords for demo)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Conversations table
-- Represents conversation threads between user and agents
CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Messages table
-- Stores all messages in conversations (user messages, agent responses, system messages)
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system', 'agent'
  content TEXT NOT NULL,
  agent_type VARCHAR(100), -- Which agent sent this (if role='agent')
  metadata JSONB DEFAULT '{}', -- Agent activity, task info, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- Queries table
-- Tracks query processing status for async operations
CREATE TABLE IF NOT EXISTS queries (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queries_conversation_id ON queries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries(user_id);
CREATE INDEX IF NOT EXISTS idx_queries_status ON queries(status);
CREATE INDEX IF NOT EXISTS idx_queries_created_at ON queries(created_at DESC);

-- Agent activity table
-- Tracks agent spawning, status changes, and communication for real-time display
CREATE TABLE IF NOT EXISTS agent_activity (
  id SERIAL PRIMARY KEY,
  query_id VARCHAR(255) NOT NULL REFERENCES queries(id) ON DELETE CASCADE,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'agent:spawned', 'agent:message', 'task:created', etc.
  agent_type VARCHAR(100),
  agent_id VARCHAR(255),
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_activity_query_id ON agent_activity(query_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_conversation_id ON agent_activity(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_event_type ON agent_activity(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created_at ON agent_activity(created_at);

-- Updated timestamp trigger for conversations
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversations_updated_at_trigger
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversations_updated_at();

-- Updated timestamp trigger for queries
CREATE OR REPLACE FUNCTION update_queries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queries_updated_at_trigger
  BEFORE UPDATE ON queries
  FOR EACH ROW
  EXECUTE FUNCTION update_queries_updated_at();

-- Function to automatically update user's last_active_at
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET last_active_at = NOW() 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on messages to update user activity
CREATE TRIGGER messages_update_user_activity
  AFTER INSERT ON messages
  FOR EACH ROW
  WHEN (NEW.role = 'user')
  EXECUTE FUNCTION update_user_last_active();

-- Trigger on conversations to update user activity
CREATE TRIGGER conversations_update_user_activity
  AFTER INSERT ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_active();
