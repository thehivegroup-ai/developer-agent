import { AgentMessage, MessagePriority } from '@developer-agent/shared';
import { EventEmitter } from 'events';
/**
 * Message queue for agent-to-agent communication
 * Implements priority-based message delivery
 */
export declare class MessageQueue extends EventEmitter {
    private queues;
    private processing;
    private readonly priorities;
    constructor();
    /**
     * Enqueue a message
     */
    enqueue(message: AgentMessage): void;
    /**
     * Dequeue the next highest priority message
     */
    private dequeue;
    /**
     * Process messages from the queue
     */
    private processQueue;
    /**
     * Get queue statistics
     */
    getStats(): Record<MessagePriority, number>;
    /**
     * Clear all queues
     */
    clear(): void;
}
//# sourceMappingURL=MessageQueue.d.ts.map