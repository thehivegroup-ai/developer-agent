import { Pool } from 'pg';
import type { AgentMessage } from '../types.js';
export declare function setPgPool(pool: Pool): void;
/**
 * Persists agent messages to PostgreSQL for history and debugging
 */
export declare class MessagePersistence {
    /**
     * Save a message to the database
     */
    saveMessage(message: AgentMessage, sessionId: string): Promise<void>;
    /**
     * Retrieve messages for a session
     */
    getMessages(sessionId: string, limit?: number): Promise<AgentMessage[]>;
    /**
     * Get messages between two agents
     */
    getConversation(sessionId: string, agentId1: string, agentId2: string): Promise<AgentMessage[]>;
    /**
     * Get message statistics for a session
     */
    getStats(sessionId: string): Promise<{
        totalMessages: number;
        messagesByType: Record<string, number>;
        messagesByAgent: Record<string, number>;
    }>;
}
//# sourceMappingURL=MessagePersistence.d.ts.map