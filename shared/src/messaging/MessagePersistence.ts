import { Pool } from 'pg';
import type { AgentMessage } from '../types.js';

// TODO: Import from api-gateway database connection
// For now, create a placeholder
let pgPool: Pool | null = null;

export function setPgPool(pool: Pool): void {
  pgPool = pool;
}

/**
 * Persists agent messages to PostgreSQL for history and debugging
 */
export class MessagePersistence {
  /**
   * Save a message to the database
   */
  async saveMessage(message: AgentMessage, sessionId: string): Promise<void> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized, skipping message persistence');
      return;
    }

    const query = `
      INSERT INTO agent_messages (
        message_id, session_id, from_agent_id, to_agent_id,
        message_type, content, parent_message_id, created_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const toAgentId = Array.isArray(message.to) ? message.to.join(',') : message.to;

    await pgPool.query(query, [
      message.id,
      sessionId,
      message.from,
      toAgentId,
      message.messageType,
      JSON.stringify(message.content),
      message.parentMessageId || null,
      message.timestamp,
      JSON.stringify(message.metadata || {}),
    ]);
  }

  /**
   * Retrieve messages for a session
   */
  async getMessages(sessionId: string, limit = 100): Promise<AgentMessage[]> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized');
      return [];
    }

    const query = `
      SELECT * FROM agent_messages
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pgPool.query(query, [sessionId, limit]);

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.message_id as string,
      timestamp: row.created_at as Date,
      from: row.from_agent_id as string,
      to: (row.to_agent_id as string).includes(',')
        ? (row.to_agent_id as string).split(',')
        : (row.to_agent_id as string),
      messageType: row.message_type as AgentMessage['messageType'],
      content: JSON.parse(row.content as string) as AgentMessage['content'],
      parentMessageId: row.parent_message_id as string | undefined,
      conversationId: sessionId,
      priority: 'normal' as const,
      metadata: JSON.parse((row.metadata as string) || '{}') as Record<string, unknown>,
    }));
  }

  /**
   * Get messages between two agents
   */
  async getConversation(
    sessionId: string,
    agentId1: string,
    agentId2: string
  ): Promise<AgentMessage[]> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized');
      return [];
    }

    const query = `
      SELECT * FROM agent_messages
      WHERE session_id = $1
        AND (
          (from_agent_id = $2 AND to_agent_id = $3)
          OR (from_agent_id = $3 AND to_agent_id = $2)
        )
      ORDER BY created_at ASC
    `;

    const result = await pgPool.query(query, [sessionId, agentId1, agentId2]);

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.message_id as string,
      timestamp: row.created_at as Date,
      from: row.from_agent_id as string,
      to: row.to_agent_id as string,
      messageType: row.message_type as AgentMessage['messageType'],
      content: JSON.parse(row.content as string) as AgentMessage['content'],
      parentMessageId: row.parent_message_id as string | undefined,
      conversationId: sessionId,
      priority: 'normal' as const,
      metadata: JSON.parse((row.metadata as string) || '{}') as Record<string, unknown>,
    }));
  }

  /**
   * Get message statistics for a session
   */
  async getStats(sessionId: string): Promise<{
    totalMessages: number;
    messagesByType: Record<string, number>;
    messagesByAgent: Record<string, number>;
  }> {
    if (!pgPool) {
      console.warn('PostgreSQL pool not initialized');
      return { totalMessages: 0, messagesByType: {}, messagesByAgent: {} };
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM agent_messages WHERE session_id = $1
    `;
    const typeQuery = `
      SELECT message_type, COUNT(*) as count
      FROM agent_messages
      WHERE session_id = $1
      GROUP BY message_type
    `;
    const agentQuery = `
      SELECT from_agent_id, COUNT(*) as count
      FROM agent_messages
      WHERE session_id = $1
      GROUP BY from_agent_id
    `;

    const [countResult, typeResult, agentResult] = await Promise.all([
      pgPool.query(countQuery, [sessionId]),
      pgPool.query(typeQuery, [sessionId]),
      pgPool.query(agentQuery, [sessionId]),
    ]);

    const messagesByType: Record<string, number> = {};
    typeResult.rows.forEach((row: Record<string, unknown>) => {
      messagesByType[row.message_type as string] = parseInt(row.count as string);
    });

    const messagesByAgent: Record<string, number> = {};
    agentResult.rows.forEach((row: Record<string, unknown>) => {
      messagesByAgent[row.from_agent_id as string] = parseInt(row.count as string);
    });

    return {
      totalMessages: parseInt((countResult.rows[0] as Record<string, unknown>).total as string),
      messagesByType,
      messagesByAgent,
    };
  }
}
