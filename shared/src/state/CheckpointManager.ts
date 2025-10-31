import { Pool } from 'pg';
import type { AgentSystemState } from './AgentSystemState.js';

// TODO: Import from api-gateway database connection
let pgPool: Pool | null = null;

export function setPgPool(pool: Pool): void {
  pgPool = pool;
}

/**
 * Checkpoint manager for LangGraph state persistence
 * Implements checkpointing to PostgreSQL
 */
export class CheckpointManager {
  /**
   * Save a checkpoint of the current state
   */
  async saveCheckpoint(
    sessionId: string,
    state: AgentSystemState,
    _metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized, skipping checkpoint');
      return;
    }

    // Create minimal user if it doesn't exist (userId might be a string, not UUID)
    // For now, use a default test user UUID
    const defaultUserId = '00000000-0000-0000-0000-000000000001';
    const userQuery = `
      INSERT INTO users (id, username, created_at, last_seen_at)
      VALUES ($1::uuid, $2, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;

    await pgPool.query(userQuery, [defaultUserId, state.userId]);

    // Note: thread_id requires a conversation_threads entry to exist
    // For now, we'll create a minimal thread entry if it doesn't exist
    const threadQuery = `
      INSERT INTO conversation_threads (id, user_id, title, created_at, updated_at)
      VALUES ($1::uuid, $2::uuid, $3, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;

    await pgPool.query(threadQuery, [
      state.threadId,
      defaultUserId,
      `Session ${state.sessionId.substring(0, 8)}`,
    ]);

    const query = `
      INSERT INTO agent_sessions (session_id, thread_id, state, status, updated_at)
      VALUES ($1, $2::uuid, $3, $4, NOW())
      ON CONFLICT (session_id)
      DO UPDATE SET
        state = EXCLUDED.state,
        status = EXCLUDED.status,
        updated_at = NOW()
    `;

    // Convert Map to object for JSON serialization
    const serializableState = {
      ...state,
      activeAgents: Array.from(state.activeAgents.entries()),
    };

    // Map state status to database status (database expects: pending, processing, completed, failed)
    const dbStatus = state.status === 'initializing' ? 'pending' : state.status;

    await pgPool.query(query, [
      sessionId,
      state.threadId,
      JSON.stringify(serializableState),
      dbStatus,
    ]);
  }

  /**
   * Load a checkpoint from the database
   */
  async loadCheckpoint(sessionId: string): Promise<AgentSystemState | null> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized');
      return null;
    }

    const query = `
      SELECT state FROM agent_sessions
      WHERE session_id = $1
    `;

    const result = await pgPool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const stateData = JSON.parse(result.rows[0].state) as Record<string, unknown>;

    // Restore Map from array
    const activeAgents = new Map((stateData.activeAgents as Array<[string, unknown]>) || []);

    return {
      ...stateData,
      activeAgents,
      queryTimestamp: new Date(stateData.queryTimestamp as string),
    } as AgentSystemState;
  }

  /**
   * List all checkpoints for a thread
   */
  async listCheckpoints(threadId: string): Promise<
    Array<{
      sessionId: string;
      status: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized');
      return [];
    }

    const query = `
      SELECT
        session_id,
        status,
        created_at,
        updated_at
      FROM agent_sessions
      WHERE state->>'threadId' = $1
      ORDER BY created_at DESC
    `;

    const result = await pgPool.query(query, [threadId]);

    return result.rows.map((row: Record<string, unknown>) => ({
      sessionId: row.session_id as string,
      status: row.status as string,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    }));
  }

  /**
   * Delete old checkpoints (cleanup)
   */
  async cleanupOldCheckpoints(olderThanDays: number): Promise<number> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized');
      return 0;
    }

    const query = `
      DELETE FROM agent_sessions
      WHERE updated_at < NOW() - INTERVAL '${olderThanDays} days'
      AND status IN ('completed', 'failed')
    `;

    const result = await pgPool.query(query);
    return result.rowCount || 0;
  }

  /**
   * Update session status
   */
  async updateStatus(sessionId: string, status: string, error?: string): Promise<void> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized');
      return;
    }

    const query = `
      UPDATE agent_sessions
      SET status = $2, error = $3, updated_at = NOW()
      WHERE session_id = $1
    `;

    await pgPool.query(query, [sessionId, status, error || null]);
  }
}
