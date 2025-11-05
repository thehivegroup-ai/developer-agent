/**
 * Chat Service - Database operations for chat/conversation system
 * Works with existing database schema (users, conversation_threads, messages tables)
 */

import { getPgPool } from './postgres.js';

// Types (matching existing database schema)
export interface User {
  id: string; // UUID
  username: string;
  createdAt: Date;
  lastSeenAt: Date;
  metadata: Record<string, unknown>;
}

export interface Conversation {
  id: string; // UUID
  userId: string; // UUID
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string; // UUID
  threadId: string; // UUID (conversation_threads)
  role: string;
  content: string;
  metadata: Record<string, unknown>;
  parentMessageId: string | null;
  createdAt: Date;
}

export interface Query {
  id: string;
  conversationId: string; // UUID
  userId: string; // UUID
  queryText: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  result: unknown | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface AgentActivity {
  id: number;
  queryId: string;
  conversationId: string; // UUID
  eventType: string;
  agentType: string | null;
  agentId: string | null;
  data: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Get or create user by username (works with existing users table)
 */
export async function getOrCreateUser(username: string): Promise<User> {
  const pool = getPgPool();

  const result = await pool.query(
    `INSERT INTO users (username, last_seen_at)
     VALUES ($1, NOW())
     ON CONFLICT (username) 
     DO UPDATE SET last_seen_at = NOW()
     RETURNING *`,
    [username]
  );

  const row = result.rows[0] as {
    id: string;
    username: string;
    created_at: Date;
    last_seen_at: Date;
    metadata: Record<string, unknown>;
  };

  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    metadata: row.metadata,
  };
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<User | null> {
  const pool = getPgPool();

  const result = await pool.query(`SELECT * FROM users WHERE username = $1`, [username]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    id: string;
    username: string;
    created_at: Date;
    last_seen_at: Date;
    metadata: Record<string, unknown>;
  };

  return {
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
    metadata: row.metadata,
  };
}

/**
 * Create a new conversation (uses conversation_threads table)
 */
export async function createConversation(
  userId: string,
  title?: string,
  metadata?: Record<string, unknown>
): Promise<Conversation> {
  const pool = getPgPool();

  const result = await pool.query(
    `INSERT INTO conversation_threads (user_id, title, metadata, is_active)
     VALUES ($1, $2, $3, true)
     RETURNING *`,
    [userId, title || null, JSON.stringify(metadata || {})]
  );

  const row = result.rows[0] as {
    id: string;
    user_id: string;
    title: string | null;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    metadata: Record<string, unknown>;
  };

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    metadata: row.metadata,
  };
}

/**
 * Get conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const pool = getPgPool();

  const result = await pool.query(`SELECT * FROM conversation_threads WHERE id = $1`, [
    conversationId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    id: string;
    user_id: string;
    title: string | null;
    created_at: Date;
    updated_at: Date;
    is_active: boolean;
    metadata: Record<string, unknown>;
  };

  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    metadata: row.metadata,
  };
}

/**
 * Get all conversations for a user
 */
export async function getConversationsByUser(userId: string): Promise<Conversation[]> {
  const pool = getPgPool();

  const result = await pool.query(
    `SELECT * FROM conversation_threads 
     WHERE user_id = $1 
     ORDER BY updated_at DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    metadata: row.metadata,
  }));
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const pool = getPgPool();

  await pool.query(`UPDATE conversation_threads SET title = $1 WHERE id = $2`, [
    title,
    conversationId,
  ]);
}

/**
 * Create a message (uses existing messages table with thread_id)
 */
export async function createMessage(params: {
  conversationId: string; // This is actually thread_id in the database
  role: string;
  content: string;
  metadata?: Record<string, unknown>;
  parentMessageId?: string;
}): Promise<Message> {
  const pool = getPgPool();
  const { conversationId, role, content, metadata, parentMessageId } = params;

  const result = await pool.query(
    `INSERT INTO messages (thread_id, role, content, metadata, parent_message_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [conversationId, role, content, JSON.stringify(metadata || {}), parentMessageId || null]
  );

  const row = result.rows[0] as {
    id: string;
    thread_id: string;
    role: string;
    content: string;
    metadata: Record<string, unknown>;
    parent_message_id: string | null;
    created_at: Date;
  };

  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata,
    parentMessageId: row.parent_message_id,
    createdAt: row.created_at,
  };
}

/**
 * Get messages for a conversation
 */
export async function getMessagesByConversation(
  conversationId: string,
  limit: number = 100
): Promise<Message[]> {
  const pool = getPgPool();

  const result = await pool.query(
    `SELECT * FROM messages 
     WHERE thread_id = $1 
     ORDER BY created_at ASC
     LIMIT $2`,
    [conversationId, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata,
    parentMessageId: row.parent_message_id,
    createdAt: row.created_at,
  }));
}

/**
 * Create a query record (we'll use agent_sessions and tasks tables)
 */
export async function createQuery(params: {
  id: string;
  conversationId: string;
  userId: string;
  queryText: string;
}): Promise<Query> {
  const pool = getPgPool();
  const { id, conversationId, userId, queryText } = params;

  // First, create or get an agent session for this conversation thread
  const sessionResult = await pool.query(
    `INSERT INTO agent_sessions (thread_id, session_id, state, status)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (session_id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
     RETURNING id`,
    [
      conversationId,
      id, // Use the query ID as the session ID
      JSON.stringify({ conversationId, userId, queryText }),
      'pending',
    ]
  );

  const sessionId = sessionResult.rows[0].id;

  // Now create a task linked to this session
  const result = await pool.query(
    `INSERT INTO tasks (session_id, task_id, description, assigned_to, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      sessionId,
      id,
      queryText,
      'DeveloperAgent',
      'pending',
      JSON.stringify({
        conversationId,
        userId,
        queryText,
        progress: 0,
        type: 'chat_query',
      }),
    ]
  );

  const row = result.rows[0] as {
    id: string;
    task_id: string;
    created_at: Date;
    started_at: Date | null;
  };

  return {
    id: row.task_id, // Use task_id as the query ID
    conversationId,
    userId,
    queryText,
    status: 'processing',
    progress: 0,
    result: null,
    error: null,
    createdAt: row.created_at,
    updatedAt: row.created_at,
    completedAt: null,
  };
}

/**
 * Update query status
 */
export async function updateQueryStatus(params: {
  queryId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
}): Promise<void> {
  const pool = getPgPool();
  const { queryId, status, progress, result, error } = params;

  // Update tasks table
  const metadata: Record<string, unknown> = {};
  if (progress !== undefined) metadata.progress = progress;
  if (result !== undefined) metadata.result = result;
  if (error !== undefined) metadata.error = error;

  await pool.query(
    `UPDATE tasks 
     SET status = $1,
         metadata = metadata || $2::jsonb
     WHERE task_id = $3`,
    [
      status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'in-progress',
      JSON.stringify(metadata),
      queryId,
    ]
  );
}

/**
 * Get query by ID
 */
export async function getQuery(queryId: string): Promise<Query | null> {
  const pool = getPgPool();

  const result = await pool.query(`SELECT * FROM tasks WHERE task_id = $1`, [queryId]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    id: string;
    task_id: string;
    description: string;
    status: string;
    metadata: Record<string, unknown>;
    created_at: Date;
    started_at: Date | null;
    completed_at: Date | null;
  };

  const metadata = row.metadata || {};

  return {
    id: row.task_id,
    conversationId: (metadata.conversationId as string) || '',
    userId: (metadata.userId as string) || '',
    queryText: (metadata.queryText as string) || row.description || '',
    status:
      row.status === 'completed' ? 'completed' : row.status === 'failed' ? 'failed' : 'processing',
    progress: (metadata.progress as number) || 0,
    result: metadata.result || null,
    error: (metadata.error as string) || null,
    createdAt: row.created_at,
    updatedAt: row.completed_at || row.started_at || row.created_at,
    completedAt: row.status === 'completed' || row.status === 'failed' ? row.completed_at : null,
  };
}

/**
 * Log agent activity (store in agent_messages table)
 */
export async function logAgentActivity(params: {
  queryId: string;
  conversationId: string;
  eventType: string;
  agentType?: string;
  agentId?: string;
  data?: Record<string, unknown>;
}): Promise<AgentActivity> {
  const pool = getPgPool();
  const { queryId, conversationId, eventType, agentType, agentId, data } = params;

  // Store in agent_messages table (existing table)
  const result = await pool.query(
    `INSERT INTO agent_messages (sender, recipient, message_type, content, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      agentId || agentType || 'system',
      'system',
      eventType,
      JSON.stringify(data || {}),
      JSON.stringify({
        queryId,
        conversationId,
        agentType,
        agentId,
      }),
    ]
  );

  const row = result.rows[0];

  return {
    id: row.id,
    queryId,
    conversationId,
    eventType,
    agentType: agentType || null,
    agentId: agentId || null,
    data: data || {},
    createdAt: row.created_at,
  };
}

/**
 * Get agent activity for a query
 */
export async function getAgentActivityByQuery(queryId: string): Promise<AgentActivity[]> {
  const pool = getPgPool();

  const result = await pool.query(
    `SELECT * FROM agent_messages 
     WHERE metadata->>'queryId' = $1 
     ORDER BY created_at ASC`,
    [queryId]
  );

  return result.rows.map((row) => {
    const metadata = row.metadata || {};
    return {
      id: row.id,
      queryId,
      conversationId: metadata.conversationId || '',
      eventType: row.message_type,
      agentType: metadata.agentType || null,
      agentId: metadata.agentId || null,
      data: typeof row.content === 'string' ? JSON.parse(row.content) : row.content,
      createdAt: row.created_at,
    };
  });
}
