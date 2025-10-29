import { pool } from '../../database/postgres.js';
import { AgentSystemState } from './AgentSystemState.js';

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
    status: string
  ): Promise<void> {
    const query = `
      INSERT INTO agent_sessions (session_id, state, status, updated_at)
      VALUES ($1, $2, $3, NOW())
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

    await pool.query(query, [
      sessionId,
      JSON.stringify(serializableState),
      status,
    ]);
  }

  /**
   * Load a checkpoint from the database
   */
  async loadCheckpoint(sessionId: string): Promise<AgentSystemState | null> {
    const query = `
      SELECT state FROM agent_sessions
      WHERE session_id = $1
    `;

    const result = await pool.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    const stateData = JSON.parse(result.rows[0].state);

    // Restore Map from array
    const activeAgents = new Map(stateData.activeAgents || []);

    return {
      ...stateData,
      activeAgents,
      queryTimestamp: new Date(stateData.queryTimestamp),
    };
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

    const result = await pool.query(query, [threadId]);

    return result.rows.map((row) => ({
      sessionId: row.session_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  /**
   * Delete old checkpoints (cleanup)
   */
  async cleanupOldCheckpoints(olderThanDays: number): Promise<number> {
    const query = `
      DELETE FROM agent_sessions
      WHERE updated_at < NOW() - INTERVAL '${olderThanDays} days'
      AND status IN ('completed', 'failed')
    `;

    const result = await pool.query(query);
    return result.rowCount || 0;
  }

  /**
   * Update session status
   */
  async updateStatus(
    sessionId: string,
    status: string,
    error?: string
  ): Promise<void> {
    const query = `
      UPDATE agent_sessions
      SET status = $2, error = $3, updated_at = NOW()
      WHERE session_id = $1
    `;

    await pool.query(query, [sessionId, status, error || null]);
  }
}
