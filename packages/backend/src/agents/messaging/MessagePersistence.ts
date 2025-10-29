import { pool } from '../../database/postgres.js';
import { AgentMessage } from '@developer-agent/shared';

/**
 * Persists agent messages to PostgreSQL for history and debugging
 */
export class MessagePersistence {
  /**
   * Save a message to the database
   */
  async saveMessage(message: AgentMessage, sessionId: string): Promise<void> {
    const query = `
      INSERT INTO agent_messages (
        message_id, session_id, from_agent_id, to_agent_id,
        message_type, content, parent_message_id, created_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const toAgentId = Array.isArray(message.to)
      ? message.to.join(',')
      : message.to;

    await pool.query(query, [
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
    const query = `
      SELECT * FROM agent_messages
      WHERE session_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool.query(query, [sessionId, limit]);

    return result.rows.map((row) => ({
      id: row.message_id,
      timestamp: row.created_at,
      from: row.from_agent_id,
      to: row.to_agent_id.includes(',')
        ? row.to_agent_id.split(',')
        : row.to_agent_id,
      messageType: row.message_type,
      content: JSON.parse(row.content),
      parentMessageId: row.parent_message_id,
      conversationId: sessionId,
      priority: 'normal',
      metadata: JSON.parse(row.metadata || '{}'),
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
    const query = `
      SELECT * FROM agent_messages
      WHERE session_id = $1
        AND (
          (from_agent_id = $2 AND to_agent_id = $3)
          OR (from_agent_id = $3 AND to_agent_id = $2)
        )
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, [sessionId, agentId1, agentId2]);

    return result.rows.map((row) => ({
      id: row.message_id,
      timestamp: row.created_at,
      from: row.from_agent_id,
      to: row.to_agent_id,
      messageType: row.message_type,
      content: JSON.parse(row.content),
      parentMessageId: row.parent_message_id,
      conversationId: sessionId,
      priority: 'normal',
      metadata: JSON.parse(row.metadata || '{}'),
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
      pool.query(countQuery, [sessionId]),
      pool.query(typeQuery, [sessionId]),
      pool.query(agentQuery, [sessionId]),
    ]);

    const messagesByType: Record<string, number> = {};
    typeResult.rows.forEach((row) => {
      messagesByType[row.message_type] = parseInt(row.count);
    });

    const messagesByAgent: Record<string, number> = {};
    agentResult.rows.forEach((row) => {
      messagesByAgent[row.from_agent_id] = parseInt(row.count);
    });

    return {
      totalMessages: parseInt(countResult.rows[0].total),
      messagesByType,
      messagesByAgent,
    };
  }
}
