/**
 * Repository Agents A2A Server
 *
 * Implements A2A Protocol v0.3.0 compliance for Repository Agents.
 * Provides HTTP endpoints for repository analysis via JSON-RPC 2.0.
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
import { NodeApiAgent } from './NodeApiAgent.js';

/**
 * Configuration options for Repository Agents A2A Server.
 */
interface RepositoryAgentsA2AServerConfig {
  /** Port to listen on (default: 3003) */
  port?: number;
  /** Enable debug logging */
  enableLogging?: boolean;
  /** Base URL for agent card */
  baseUrl?: string;
}

/**
 * Repository Agents A2A Server
 *
 * Wraps the NodeApiAgent with A2A protocol compliance:
 * - HTTP endpoints (JSON-RPC 2.0)
 * - Agent Card publishing
 * - Task lifecycle management
 * - Standard A2A message handling
 */
export class RepositoryAgentsA2AServer {
  private readonly agent: NodeApiAgent;
  private readonly transport: JsonRpcTransport;
  private readonly taskManager: TaskManager;
  private readonly config: Required<RepositoryAgentsA2AServerConfig>;
  private readonly agentCard: AgentCard;
  private server?: Server;

  constructor(config: RepositoryAgentsA2AServerConfig = {}) {
    this.config = {
      port: config.port ?? 3003,
      enableLogging: config.enableLogging ?? true,
      baseUrl: config.baseUrl ?? `http://localhost:${config.port ?? 3003}`,
    };

    // Initialize Node API Agent
    this.agent = new NodeApiAgent('node-api');

    // Initialize Task Manager with in-memory storage
    this.taskManager = new TaskManagerImpl(new InMemoryTaskStorage());

    // Initialize JSON-RPC transport
    this.transport = new JsonRpcTransportImpl({
      enableLogging: this.config.enableLogging,
    });

    // Build Agent Card - generic repository agent (not type-specific)
    this.agentCard = AgentCardTemplates.repositoryAgent(this.config.baseUrl).build();

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
   * Creates or updates a task and processes the message through Node API Agent.
   */
  private async handleMessageSend(params: MessageSendParams): Promise<MessageSendResult> {
    if (this.config.enableLogging) {
      console.log(
        '[Repository Agents A2A] message/send received:',
        JSON.stringify(params, null, 2)
      );
    }

    // Validate required parameters
    if (!params.message) {
      throw createA2AError(-32602, 'Missing required parameter: message');
    }
    if (!params.message.parts || !Array.isArray(params.message.parts)) {
      throw createA2AError(-32602, 'Missing or invalid message.parts');
    }
    if (params.message.parts.length === 0) {
      throw createA2AError(-32602, 'message.parts cannot be empty');
    }

    // Extract message content and top-level metadata (supports both locations per A2A spec flexibility)
    const { message, taskId } = params;
    const paramsWithExtras = params as MessageSendParams & {
      contextId?: string;
      metadata?: Record<string, unknown>;
    };
    const contextId = paramsWithExtras.contextId;
    const metadata = paramsWithExtras.metadata;

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
        contextId: contextId || message.contextId,
        message: 'Processing repository operation',
        metadata: metadata || message.metadata,
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
      await this.taskManager.startTask(task.id, 'Processing repository operation');
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
      // - "analyze repository: <owner>/<repo>"
      // - "extract endpoints: <owner>/<repo>"
      // - "search dependencies: <query>"
      // - "detect type: <owner>/<repo>"

      // Parse operation from message
      const operation = this.parseRepositoryOperation(messageText);

      // If we can't parse a specific operation, accept the message generically
      // This allows for testing and exploration without strict format requirements
      if (!operation) {
        // Generic message - accept but log that we couldn't parse it
        await this.taskManager.updateTaskStatus(task.id, {
          message: 'Processing repository operation',
          state: TaskState.WORKING,
        });

        if (this.config.enableLogging) {
          console.log('[Repository Agents A2A] Generic message received:', messageText);
        }
      } else {
        // Process message with Node API Agent
        // Note: This is a simplified integration - a full integration would
        // properly map A2A messages to the agent's internal message format.
        // For now, we'll execute the operation directly and store result in task
        await this.taskManager.updateTaskStatus(task.id, {
          message: `Processing ${operation.type} operation`,
          state: TaskState.WORKING,
        });

        // Log the operation (in a real implementation, this would call the agent's methods)
        if (this.config.enableLogging) {
          console.log(`[Repository Agents A2A] Executing ${operation.type} with:`, operation);
        }
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
   * Retrieves task status and results.
   */
  private async handleTasksGet(params: TasksGetParams): Promise<TasksGetResult> {
    if (this.config.enableLogging) {
      console.log('[Repository Agents A2A] tasks/get received:', JSON.stringify(params, null, 2));
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
      console.log(
        '[Repository Agents A2A] tasks/cancel received:',
        JSON.stringify(params, null, 2)
      );
    }

    const task = await this.taskManager.cancelTask(params.taskId, params.reason);

    return { task };
  }

  /**
   * Parse repository operation from message text
   */
  private parseRepositoryOperation(message: string): {
    type: string;
    owner?: string;
    repo?: string;
    query?: string;
    branch?: string;
  } | null {
    const lowerMessage = message.toLowerCase().trim();

    // Pattern: "analyze repository: owner/repo" or "analyze: owner/repo"
    const analyzePattern =
      /^analyze(?:\s+repository)?:\s*([^/\s]+)\/([^\s]+)(?:\s+branch:\s*(\S+))?/;
    const analyzeMatch = analyzePattern.exec(lowerMessage);
    if (analyzeMatch) {
      return {
        type: 'analyze',
        owner: analyzeMatch[1],
        repo: analyzeMatch[2],
        branch: analyzeMatch[3],
      };
    }

    // Pattern: "extract endpoints: owner/repo" or "endpoints: owner/repo"
    const endpointsPattern =
      /^(?:extract\s+)?endpoints:\s*([^/\s]+)\/([^\s]+)(?:\s+branch:\s*(\S+))?/;
    const endpointsMatch = endpointsPattern.exec(lowerMessage);
    if (endpointsMatch) {
      return {
        type: 'extract-endpoints',
        owner: endpointsMatch[1],
        repo: endpointsMatch[2],
        branch: endpointsMatch[3],
      };
    }

    // Pattern: "search dependencies: query" or "dependencies: query"
    const depsPattern = /^(?:search\s+)?dependencies:\s*(.+)$/;
    const depsMatch = depsPattern.exec(lowerMessage);
    if (depsMatch) {
      return {
        type: 'search-dependencies',
        query: depsMatch[1]!.trim(),
      };
    }

    // Pattern: "detect type: owner/repo" or "repository type: owner/repo"
    const typePattern =
      /^(?:detect\s+type|repository\s+type):\s*([^/\s]+)\/([^\s]+)(?:\s+branch:\s*(\S+))?/;
    const typeMatch = typePattern.exec(lowerMessage);
    if (typeMatch) {
      return {
        type: 'detect-type',
        owner: typeMatch[1],
        repo: typeMatch[2],
        branch: typeMatch[3],
      };
    }

    return null;
  }

  /**
   * Start the HTTP server.
   *
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    // Initialize Node API Agent
    await this.agent.init();

    // Create Express app with JSON-RPC transport
    const app = this.transport.createApp();

    // Serve Agent Card at /.well-known/agent-card.json
    app.get('/.well-known/agent-card.json', (_req, res) => {
      res.json(this.agentCard);
    });

    // Start server
    this.server = app.listen(this.config.port, () => {
      console.log(`[Repository Agents A2A] Server listening on ${this.config.baseUrl}`);
      console.log(
        `[Repository Agents A2A] Agent Card: ${this.config.baseUrl}/.well-known/agent-card.json`
      );
      console.log(`[Repository Agents A2A] Health check: ${this.config.baseUrl}/health`);
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
            console.log('[Repository Agents A2A] Server stopped');
            resolve();
          }
        });
      });
    }

    await this.agent.shutdown();
  }
}

// Run standalone if executed directly
if (import.meta.url === `file:///${process.argv[1]?.replaceAll('\\', '/')}`) {
  const server = new RepositoryAgentsA2AServer();

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Start server
  await server.start();

  // Keep process alive - the HTTP server will handle requests
  await new Promise(() => {}); // Never resolves, keeps event loop alive
}
