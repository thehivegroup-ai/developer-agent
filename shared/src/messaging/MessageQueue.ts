import { AgentMessage, MessagePriority } from '@developer-agent/shared';
import { EventEmitter } from 'events';

/**
 * Message queue for agent-to-agent communication
 * Implements priority-based message delivery
 */
export class MessageQueue extends EventEmitter {
  private queues: Map<MessagePriority, AgentMessage[]> = new Map([
    ['urgent', []],
    ['high', []],
    ['normal', []],
    ['low', []],
  ]);

  private processing = false;
  private readonly priorities: MessagePriority[] = ['urgent', 'high', 'normal', 'low'];

  constructor() {
    super();
  }

  /**
   * Enqueue a message
   */
  enqueue(message: AgentMessage): void {
    const queue = this.queues.get(message.priority) || this.queues.get('normal')!;
    queue.push(message);

    // Emit event for monitoring
    this.emit('message:enqueued', message);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Dequeue the next highest priority message
   */
  private dequeue(): AgentMessage | undefined {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    return undefined;
  }

  /**
   * Process messages from the queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true;

    while (true) {
      const message = this.dequeue();
      if (!message) {
        break;
      }

      // Check if message has expired
      if (message.expiresAt && new Date() > message.expiresAt) {
        this.emit('message:expired', message);
        continue;
      }

      // Emit message for router to handle
      this.emit('message:ready', message);
    }

    this.processing = false;
  }

  /**
   * Get queue statistics
   */
  getStats(): Record<MessagePriority, number> {
    const stats: Record<string, number> = {};
    for (const [priority, queue] of this.queues.entries()) {
      stats[priority] = queue.length;
    }
    return stats as Record<MessagePriority, number>;
  }

  /**
   * Clear all queues
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
  }
}
