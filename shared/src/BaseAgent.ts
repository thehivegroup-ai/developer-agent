import { v4 as uuidv4 } from 'uuid';
import { IAgent } from './IAgent.js';
import {
  AgentMessage,
  AgentMetadata,
  AgentStatus,
  AgentType,
  RepositoryType,
} from '@developer-agent/shared';

export interface BaseAgentConfig {
  agentType: AgentType;
  repositoryType?: RepositoryType;
  repositoryName?: string;
  ttlMinutes?: number;
  metadata?: Record<string, unknown>;
}

export abstract class BaseAgent implements IAgent {
  protected readonly agentId: string;
  protected readonly agentType: AgentType;
  protected readonly repositoryType?: RepositoryType;
  protected readonly repositoryName?: string;
  protected readonly ttlMinutes: number;
  protected readonly metadata: Record<string, unknown>;

  protected status: AgentStatus = 'idle';
  protected currentTask?: string;
  protected readonly spawnedAt: Date;
  protected lastActivityAt: Date;
  protected ttlExpiresAt: Date;

  // Message handling
  protected messageHandlers: Map<string, (message: AgentMessage) => Promise<AgentMessage>> =
    new Map();

  constructor(config: BaseAgentConfig) {
    this.agentId = uuidv4();
    this.agentType = config.agentType;
    this.repositoryType = config.repositoryType;
    this.repositoryName = config.repositoryName;
    this.ttlMinutes = config.ttlMinutes || 60; // Default 60 minutes
    this.metadata = config.metadata || {};

    this.spawnedAt = new Date();
    this.lastActivityAt = new Date();
    this.ttlExpiresAt = new Date(Date.now() + this.ttlMinutes * 60 * 1000);
  }

  /**
   * Initialize the agent - load resources, connect to services, etc.
   */
  abstract init(): Promise<void>;

  /**
   * Handle incoming requests
   */
  abstract handleRequest(request: unknown): Promise<unknown>;

  /**
   * Cleanup and shutdown the agent
   */
  abstract shutdown(): Promise<void>;

  /**
   * Get current agent metadata
   */
  getMetadata(): AgentMetadata {
    return {
      agentId: this.agentId,
      agentType: this.agentType,
      repositoryType: this.repositoryType,
      repositoryName: this.repositoryName,
      status: this.status,
      currentTask: this.currentTask,
      spawnedAt: this.spawnedAt,
      lastActivityAt: this.lastActivityAt,
      ttlExpiresAt: this.ttlExpiresAt,
      metadata: this.metadata,
    };
  }

  /**
   * Update agent status
   */
  protected setStatus(status: AgentStatus, task?: string): void {
    this.status = status;
    this.currentTask = task;
    this.lastActivityAt = new Date();
  }

  /**
   * Check if agent has expired based on TTL
   */
  isExpired(): boolean {
    return Date.now() > this.ttlExpiresAt.getTime();
  }

  /**
   * Extend the TTL of the agent
   */
  extendTTL(additionalMinutes: number): void {
    this.ttlExpiresAt = new Date(this.ttlExpiresAt.getTime() + additionalMinutes * 60 * 1000);
    this.lastActivityAt = new Date();
  }

  /**
   * Register a message handler for a specific action
   */
  protected registerMessageHandler(
    action: string,
    handler: (message: AgentMessage) => Promise<AgentMessage>
  ): void {
    this.messageHandlers.set(action, handler);
  }

  /**
   * Handle an incoming message
   */
  async handleMessage(message: AgentMessage): Promise<AgentMessage | null> {
    this.lastActivityAt = new Date();

    // Extract action from message content
    const action = message.content.action;
    if (!action) {
      return this.createErrorResponse(message, 'NO_ACTION', 'Message does not contain an action');
    }

    // Find and execute handler
    const handler = this.messageHandlers.get(action);
    if (!handler) {
      return this.createErrorResponse(
        message,
        'UNKNOWN_ACTION',
        `No handler registered for action: ${action}`
      );
    }

    try {
      this.setStatus('busy', `Processing: ${action}`);
      const response = await handler(message);
      this.setStatus('idle');
      return response;
    } catch (error) {
      this.setStatus('error', `Failed: ${action}`);
      return this.createErrorResponse(
        message,
        'HANDLER_ERROR',
        error instanceof Error ? error.message : 'Unknown error',
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  /**
   * Create a response message
   */
  protected createResponse(originalMessage: AgentMessage, data?: unknown): AgentMessage {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      from: this.agentId,
      to: originalMessage.from,
      messageType: 'response',
      content: {
        data,
      },
      parentMessageId: originalMessage.id,
      conversationId: originalMessage.conversationId,
      priority: originalMessage.priority,
    };
  }

  /**
   * Create an error response message
   */
  protected createErrorResponse(
    originalMessage: AgentMessage,
    errorCode: string,
    errorMessage: string,
    stack?: string
  ): AgentMessage {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      from: this.agentId,
      to: originalMessage.from,
      messageType: 'error',
      content: {
        error: {
          code: errorCode,
          message: errorMessage,
          stack,
          recoverable: true,
        },
      },
      parentMessageId: originalMessage.id,
      conversationId: originalMessage.conversationId,
      priority: originalMessage.priority,
    };
  }

  /**
   * Send a notification message
   */
  protected createNotification(
    to: string | string[],
    status: string,
    message: string,
    conversationId?: string
  ): AgentMessage {
    return {
      id: uuidv4(),
      timestamp: new Date(),
      from: this.agentId,
      to,
      messageType: 'notification',
      content: {
        status: {
          state: status,
          details: message,
          progress: 0,
        },
      },
      conversationId,
      priority: 'normal',
    };
  }

  /**
   * Log agent activity
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: unknown): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      agentId: this.agentId,
      agentType: this.agentType,
      level,
      message,
      data,
    };
    console.log(JSON.stringify(logEntry));
  }
}
