/**
 * A2A HTTP Server for Developer Agent
 *
 * Exposes the Developer Agent via A2A-compliant HTTP endpoint.
 *
 * Port: 3001
 * Protocol: JSON-RPC 2.0 over HTTP
 * Agent Card: Available at /.well-known/agent-card.json
 *
 * Implements A2A RPC methods:
 * - message/send - Send message and create/update task
 * - tasks/get - Retrieve task status
 * - tasks/cancel - Cancel a running task
 */

import express from 'express';
import {
  JsonRpcTransport,
  TaskManager,
  AgentCardTemplates,
  MessageSendParams,
  MessageSendResult,
  TasksGetParams,
  TasksGetResult,
  TasksCancelParams,
  TasksCancelResult,
  A2AMessage,
  TaskState,
  isTextPart,
  A2AErrorCode,
  createA2AError,
} from '@developer-agent/shared';
import { DeveloperAgent } from './index.js';
import { randomUUID } from 'node:crypto';

/**
 * A2A HTTP Server configuration
 */
export interface A2AServerConfig {
  /** Port to listen on (default: 3001) */
  port?: number;

  /** Base URL for this agent (default: http://localhost:3001) */
  baseUrl?: string;

  /** Enable verbose logging (default: false) */
  enableLogging?: boolean;
}

/**
 * A2A HTTP Server for Developer Agent.
 *
 * Wraps the existing DeveloperAgent with A2A-compliant HTTP interface.
 *
 * Example usage:
 * ```typescript
 * const server = new DeveloperAgentA2AServer();
 * await server.start();
 *
 * // Server now listening on http://localhost:3001
 * // Agent Card available at http://localhost:3001/.well-known/agent-card.json
 * ```
 */
export class DeveloperAgentA2AServer {
  private readonly config: Required<A2AServerConfig>;
  private readonly transport: JsonRpcTransport;
  private readonly taskManager: TaskManager;
  private readonly agent: DeveloperAgent;
  private readonly agentCard: string;
  private app?: express.Application;
  private server?: ReturnType<typeof express.application.listen>;

  constructor(config: A2AServerConfig = {}) {
    this.config = {
      port: config.port || 3001,
      baseUrl: config.baseUrl || 'http://localhost:3001',
      enableLogging: config.enableLogging ?? false,
    };

    // Initialize components
    this.agent = new DeveloperAgent();
    this.taskManager = new TaskManager();
    this.transport = new JsonRpcTransport({
      enableLogging: this.config.enableLogging,
    });

    // Build Agent Card
    this.agentCard = AgentCardTemplates.developerAgent(this.config.baseUrl)
      .setOwner({
        name: 'TheHiveGroup AI',
        url: 'https://github.com/thehivegroup-ai',
      })
      .buildJson();

    // Register A2A RPC methods
    this.registerMethods();
  }

  /**
   * Register all A2A RPC methods.
   */
  private registerMethods(): void {
    // message/send - Send message and create/update task
    this.transport.registerMethod('message/send', async (params: MessageSendParams) => {
      return this.handleMessageSend(params);
    });

    // tasks/get - Get task status
    this.transport.registerMethod('tasks/get', async (params: TasksGetParams) => {
      return this.handleTasksGet(params);
    });

    // tasks/cancel - Cancel a task
    this.transport.registerMethod('tasks/cancel', async (params: TasksCancelParams) => {
      return this.handleTasksCancel(params);
    });
  }

  /**
   * Handle message/send RPC method.
   *
   * Creates a new task or continues an existing one, processes the message,
   * and returns the updated task.
   */
  private async handleMessageSend(params: MessageSendParams): Promise<MessageSendResult> {
    if (this.config.enableLogging) {
      console.log('[DeveloperAgent A2A] message/send received:', JSON.stringify(params, null, 2));
    }

    // Extract message content
    const { message, taskId } = params;

    // Get or create task
    let task;
    if (taskId) {
      // Continue existing task
      task = await this.taskManager.getTask(taskId);
    } else {
      // Create new task
      task = await this.taskManager.createTask({
        contextId: message.contextId,
        message: 'Processing request',
      });
    }

    // Create A2A message with ID
    const a2aMessage: A2AMessage = {
      messageId: randomUUID(),
      taskId: task.id,
      role: message.role,
      parts: message.parts,
      timestamp: new Date().toISOString(),
      contextId: message.contextId,
      metadata: message.metadata,
    };

    // Start task if it's in submitted state
    if (task.status.state === TaskState.SUBMITTED) {
      await this.taskManager.startTask(task.id, 'Processing message');
    }

    try {
      // Extract text from message parts
      const textParts = a2aMessage.parts.filter(isTextPart);
      const messageText = textParts.map((part) => part.text).join('\n');

      if (!messageText) {
        throw createA2AError(
          A2AErrorCode.UNSUPPORTED_MESSAGE_FORMAT,
          'Message must contain at least one text part'
        );
      }

      // Process message with Developer Agent
      // Note: This is a simplified integration - full integration would map
      // the A2A message to the agent's internal message format
      await this.agent.handleRequest({
        query: messageText,
        taskId: task.id,
      });

      // Update task with result
      await this.taskManager.completeTask(task.id, 'Request completed successfully', []);

      // Get updated task
      task = await this.taskManager.getTask(task.id);

      return {
        task,
        messageId: a2aMessage.messageId,
      };
    } catch (error) {
      // Mark task as failed
      await this.taskManager.failTask(task.id, error as Error);

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Handle tasks/get RPC method.
   *
   * Retrieves task status by ID.
   */
  private async handleTasksGet(params: TasksGetParams): Promise<TasksGetResult> {
    if (this.config.enableLogging) {
      console.log('[DeveloperAgent A2A] tasks/get received:', JSON.stringify(params, null, 2));
    }

    const task = await this.taskManager.getTask(params.taskId);

    return { task };
  }

  /**
   * Handle tasks/cancel RPC method.
   *
   * Cancels a running task.
   */
  private async handleTasksCancel(params: TasksCancelParams): Promise<TasksCancelResult> {
    if (this.config.enableLogging) {
      console.log('[DeveloperAgent A2A] tasks/cancel received:', JSON.stringify(params, null, 2));
    }

    const task = await this.taskManager.cancelTask(params.taskId, params.reason);

    return { task };
  }

  /**
   * Start the HTTP server.
   *
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    // Initialize agent
    await this.agent.init();

    // Create Express app
    this.app = express();

    // Add JSON-RPC transport middleware
    this.app.use('/', this.transport.middleware());

    // Add Agent Card endpoint
    this.app.get('/.well-known/agent-card.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.agentCard);
    });

    // Start server
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app!.listen(this.config.port, () => {
          console.log(`[DeveloperAgent A2A] Server listening on ${this.config.baseUrl}`);
          console.log(
            `[DeveloperAgent A2A] Agent Card: ${this.config.baseUrl}/.well-known/agent-card.json`
          );
          console.log(`[DeveloperAgent A2A] Health check: ${this.config.baseUrl}/health`);
          resolve();
        });

        this.server.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the HTTP server.
   *
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log('[DeveloperAgent A2A] Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express app (for testing).
   */
  getApp(): express.Application | undefined {
    return this.app;
  }

  /**
   * Get the task manager (for testing).
   */
  getTaskManager(): TaskManager {
    return this.taskManager;
  }

  /**
   * Get the agent instance (for testing).
   */
  getAgent(): DeveloperAgent {
    return this.agent;
  }
}

/**
 * Start the Developer Agent A2A server (for standalone execution).
 */
async function main(): Promise<void> {
  const server = new DeveloperAgentA2AServer({
    enableLogging: true,
  });

  await server.start();

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    void server.stop().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    void server.stop().then(() => process.exit(0));
  });
}

// Run if this is the main module
main().catch((error) => {
  console.error('Failed to start Developer Agent A2A server:', error);
  process.exit(1);
});
