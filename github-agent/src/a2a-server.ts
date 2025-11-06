/**
 * GitHub Agent A2A Server
 *
 * Implements A2A Protocol v0.3.0 compliance for GitHub Agent.
 * Provides HTTP endpoints for repository discovery and analysis via JSON-RPC 2.0.
 */

import type { Server } from 'node:http';
import type {
  TaskManager,
  AgentCard,
  A2AMessage,
  A2ATask,
  MessageSendParams,
  MessageSendResult,
  TasksGetParams,
  TasksGetResult,
  TasksCancelParams,
  TasksCancelResult,
  JsonRpcTransport,
} from '@developer-agent/shared';
import {
  TaskState,
  TaskManager as TaskManagerImpl,
  InMemoryTaskStorage,
  AgentCardTemplates,
  JsonRpcTransport as JsonRpcTransportImpl,
  createA2AError,
  A2AErrorCode,
  isTextPart,
} from '@developer-agent/shared';
import { GitHubAgent } from './index.js';

/**
 * Configuration options for GitHub Agent A2A Server.
 */
interface GitHubAgentA2AServerConfig {
  /** Port to listen on (default: 3002) */
  port?: number;
  /** Enable debug logging */
  enableLogging?: boolean;
  /** Base URL for agent card */
  baseUrl?: string;
}

/**
 * GitHub Agent A2A Server
 *
 * Wraps the GitHubAgent with A2A protocol compliance:
 * - HTTP endpoints (JSON-RPC 2.0)
 * - Agent Card publishing
 * - Task lifecycle management
 * - Standard A2A message handling
 */
export class GitHubAgentA2AServer {
  private readonly agent: GitHubAgent;
  private readonly transport: JsonRpcTransport;
  private readonly taskManager: TaskManager;
  private readonly config: Required<GitHubAgentA2AServerConfig>;
  private readonly agentCard: AgentCard;
  private server?: Server;

  constructor(config: GitHubAgentA2AServerConfig = {}) {
    this.config = {
      port: config.port ?? 3002,
      enableLogging: config.enableLogging ?? true,
      baseUrl: config.baseUrl ?? `http://localhost:${config.port ?? 3002}`,
    };

    // Initialize GitHub Agent
    this.agent = new GitHubAgent();

    // Initialize Task Manager with in-memory storage
    this.taskManager = new TaskManagerImpl(new InMemoryTaskStorage());

    // Initialize JSON-RPC transport
    this.transport = new JsonRpcTransportImpl({
      enableLogging: this.config.enableLogging,
    });

    // Build Agent Card
    this.agentCard = AgentCardTemplates.githubAgent(this.config.baseUrl).build();

    // Register RPC methods
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
   * Creates or updates a task and processes the message through GitHub Agent.
   */
  private async handleMessageSend(params: MessageSendParams): Promise<MessageSendResult> {
    if (this.config.enableLogging) {
      console.log('[GitHubAgent A2A] message/send received:', JSON.stringify(params, null, 2));
    }

    const { message, taskId } = params;

    // Validate message
    if (!message.parts || message.parts.length === 0) {
      throw createA2AError(
        A2AErrorCode.UNSUPPORTED_MESSAGE_FORMAT,
        'Message must contain at least one part'
      );
    }

    // Create or get existing task
    let task: A2ATask;
    if (taskId) {
      task = await this.taskManager.getTask(taskId);
    } else {
      task = await this.taskManager.createTask({
        contextId: message.contextId,
        message: 'Processing GitHub operation',
      });
    }

    // Build A2A message
    const a2aMessage: A2AMessage = {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      taskId: task.id,
      role: message.role,
      parts: message.parts,
      timestamp: new Date().toISOString(),
      contextId: message.contextId,
      metadata: message.metadata,
    };

    // Start task if it's in submitted state
    if (task.status.state === TaskState.SUBMITTED) {
      await this.taskManager.startTask(task.id, 'Processing GitHub operation');
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

      // Parse the message to determine action
      // Expected formats:
      // - "search repositories: <query>"
      // - "discover repository: <owner>/<repo>"
      // - "analyze repository: <owner>/<repo>"
      // - "detect repository type: <owner>/<repo>"

      let action: string;
      let parameters: Record<string, unknown> = {};

      if (messageText.toLowerCase().startsWith('search repositories:')) {
        action = 'discover';
        const query = messageText.substring('search repositories:'.length).trim();
        parameters = { query, limit: 10 };
      } else if (messageText.toLowerCase().startsWith('discover repository:')) {
        action = 'discover';
        const repo = messageText.substring('discover repository:'.length).trim();
        const [owner, repoName] = repo.split('/');
        parameters = { owner, repo: repoName };
      } else if (messageText.toLowerCase().startsWith('analyze repository:')) {
        action = 'analyze';
        const repo = messageText.substring('analyze repository:'.length).trim();
        const [owner, repoName] = repo.split('/');
        parameters = { owner, repo: repoName };
      } else if (messageText.toLowerCase().startsWith('detect repository type:')) {
        action = 'detectType';
        const repo = messageText.substring('detect repository type:'.length).trim();
        const [owner, repoName] = repo.split('/');
        parameters = { owner, repo: repoName };
      } else {
        // Default to search if no specific action
        action = 'discover';
        parameters = { query: messageText, limit: 10 };
      }

      // Process message with GitHub Agent
      // Note: This is a simplified integration - a full integration would
      // properly map A2A messages to the agent's internal message format.
      // For now, we'll execute the action directly and store result in task
      await this.taskManager.updateTaskStatus(task.id, {
        message: `Processing ${action} operation`,
        state: TaskState.WORKING,
      });

      // Log the operation (in a real implementation, this would call the agent's methods)
      if (this.config.enableLogging) {
        console.log(`[GitHubAgent A2A] Executing ${action} with parameters:`, parameters);
      }

      // Note: Task remains in WORKING state and must be completed/failed via subsequent calls
      // This allows tasks to be canceled while in progress

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
      console.log('[GitHubAgent A2A] tasks/get received:', JSON.stringify(params, null, 2));
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
      console.log('[GitHubAgent A2A] tasks/cancel received:', JSON.stringify(params, null, 2));
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
    // Initialize GitHub Agent
    await this.agent.init();

    // Create Express app with JSON-RPC transport
    const app = this.transport.createApp();

    // Serve Agent Card at /.well-known/agent-card.json
    app.get('/.well-known/agent-card.json', (_req, res) => {
      res.json(this.agentCard);
    });

    // Start server
    this.server = app.listen(this.config.port, () => {
      console.log(`[GitHubAgent A2A] Server listening on ${this.config.baseUrl}`);
      console.log(
        `[GitHubAgent A2A] Agent Card: ${this.config.baseUrl}/.well-known/agent-card.json`
      );
      console.log(`[GitHubAgent A2A] Health check: ${this.config.baseUrl}/health`);
    });
  }

  /**
   * Stop the HTTP server.
   *
   * @returns Promise that resolves when server is closed
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve, reject) => {
        if (!this.server) {
          resolve();
          return;
        }
        this.server.close((err?: Error) => {
          if (err) {
            reject(err);
          } else {
            console.log('[GitHubAgent A2A] Server stopped');
            resolve();
          }
        });
      });
    }
  }
}

/**
 * Main entry point for standalone execution.
 */
async function main(): Promise<void> {
  const server = new GitHubAgentA2AServer({
    enableLogging: true,
  });

  await server.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    void server.stop().then(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    void server.stop().then(() => process.exit(0));
  });
}

// Run if executed directly
try {
  await main();
} catch (error) {
  console.error('Fatal error starting GitHub Agent A2A Server:', error);
  process.exit(1);
}
