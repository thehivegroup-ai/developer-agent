import { Pool } from 'pg';
import type { AgentSystemState } from './AgentSystemState.js';
export declare function setPgPool(pool: Pool): void;
/**
 * Checkpoint manager for LangGraph state persistence
 * Implements checkpointing to PostgreSQL
 */
export declare class CheckpointManager {
    /**
     * Save a checkpoint of the current state
     */
    saveCheckpoint(sessionId: string, state: AgentSystemState, _metadata?: Record<string, unknown>): Promise<void>;
    /**
     * Load a checkpoint from the database
     */
    loadCheckpoint(sessionId: string): Promise<AgentSystemState | null>;
    /**
     * List all checkpoints for a thread
     */
    listCheckpoints(threadId: string): Promise<Array<{
        sessionId: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
    }>>;
    /**
     * Delete old checkpoints (cleanup)
     */
    cleanupOldCheckpoints(olderThanDays: number): Promise<number>;
    /**
     * Update session status
     */
    updateStatus(sessionId: string, status: string, error?: string): Promise<void>;
}
//# sourceMappingURL=CheckpointManager.d.ts.map