/**
 * Relationship Agent A2A Server
 *
 * HTTP server implementing A2A Protocol v0.3.0 for the Relationship Agent.
 * Wraps BaseRelationshipAgent functionality and exposes it via JSON-RPC 2.0 over HTTP.
 *
 * Port: 3004
 * Protocol: A2A Protocol v0.3.0
 * Transport: JSON-RPC 2.0 over HTTP
 *
 * Capabilities:
 * - Build and maintain knowledge graphs
 * - Track cross-repository relationships
 * - Analyze entity relationships and dependencies
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
  JsonRpcTransport as JsonRpcTransportImpl,
  AgentCardTemplates,
  createA2AError,
  A2AErrorCode,
  isTextPart,
} from '@developer-agent/shared';
import { BaseRelationshipAgent } from './BaseRelationshipAgent.js';

/**
 * Configuration options for Relationship Agent A2A Server.
 */
interface RelationshipAgentA2AServerConfig {
  port?: number;
  enableLogging?: boolean;
  baseUrl?: string;
}

/**
 * Relationship Agent implementation for A2A server
 */
class RelationshipAgentImpl extends BaseRelationshipAgent {
  constructor() {
    super({
      agentType: 'relationship',
    });
  }

  async init(): Promise<void> {
    console.log('✅ Relationship Agent initialized');
  }

  async handleRequest(request: unknown): Promise<unknown> {
    console.log('[Relationship Agent] Handling request:', request);
    return { status: 'processed' };
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Relationship Agent cleanup complete');
  }
}

/**
 * A2A HTTP Server for Relationship Agent
 *
 * Implements the A2A Protocol v0.3.0 specification for knowledge graph operations.
 */
export class RelationshipAgentA2AServer {
  private readonly config: Required<RelationshipAgentA2AServerConfig>;
  private readonly agent: RelationshipAgentImpl;
  private readonly taskManager: TaskManager;
  private readonly transport: JsonRpcTransport;
  private readonly agentCard: AgentCard;
  private server?: Server;

  constructor(config: RelationshipAgentA2AServerConfig = {}) {
    this.config = {
      port: config.port ?? 3004,
      enableLogging: config.enableLogging ?? true,
      baseUrl: config.baseUrl ?? `http://localhost:${config.port ?? 3004}`,
    };

    // Initialize Relationship Agent
    this.agent = new RelationshipAgentImpl();

    // Initialize Task Manager with in-memory storage
    this.taskManager = new TaskManagerImpl(new InMemoryTaskStorage());

    // Initialize JSON-RPC transport
    this.transport = new JsonRpcTransportImpl({
      enableLogging: this.config.enableLogging,
    });

    // Build Agent Card
    this.agentCard = AgentCardTemplates.relationshipAgent(this.config.baseUrl).build();

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
   * Creates or updates a task and processes the message through Relationship Agent.
   */
  private async handleMessageSend(params: MessageSendParams): Promise<MessageSendResult> {
    if (this.config.enableLogging) {
      console.log('[RelationshipAgent A2A] message/send received:', JSON.stringify(params, null, 2));
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
        message: 'Processing relationship operation',
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
      await this.taskManager.startTask(task.id, 'Processing relationship operation');
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
      // - "build graph: <description>"
      // - "analyze relationships: <query>"
      // - "find connections: <query>"
      // - "track dependency: <description>"

      let action: string;
      let parameters: Record<string, unknown> = {};

      if (messageText.toLowerCase().startsWith('build graph:')) {
        action = 'buildGraph';
        const description = messageText.substring('build graph:'.length).trim();
        parameters = { description };
      } else if (messageText.toLowerCase().startsWith('analyze relationships:')) {
        action = 'analyzeRelationships';
        const query = messageText.substring('analyze relationships:'.length).trim();
        parameters = { query };
      } else if (messageText.toLowerCase().startsWith('find connections:')) {
        action = 'findConnections';
        const query = messageText.substring('find connections:'.length).trim();
        parameters = { query };
      } else if (messageText.toLowerCase().startsWith('track dependency:')) {
        action = 'trackDependency';
        const description = messageText.substring('track dependency:'.length).trim();
        parameters = { description };
      } else {
        throw createA2AError(
          A2AErrorCode.UNSUPPORTED_MESSAGE_FORMAT,
          'Unsupported message format. Expected: "build graph: <description>", "analyze relationships: <query>", "find connections: <query>", or "track dependency: <description>"'
        );
      }

      // Process message with Relationship Agent
      // Note: This is a simplified integration - a full integration would
      // properly map A2A messages to the agent's internal message format.
      // For now, we'll execute the action directly and store result in task
      await this.taskManager.updateTaskStatus(task.id, {
        message: `Processing ${action} operation`,
        state: TaskState.WORKING,
      });

      // Log the operation (in a real implementation, this would call the agent's methods)
      if (this.config.enableLogging) {
        console.log(`[RelationshipAgent A2A] Executing ${action} with parameters:`, parameters);
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
      console.log('[RelationshipAgent A2A] tasks/get received:', JSON.stringify(params, null, 2));
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
      console.log('[RelationshipAgent A2A] tasks/cancel received:', JSON.stringify(params, null, 2));
    }

    const task = await this.taskManager.cancelTask(params.taskId, params.reason);

    return { task };
  }

  /**
   * Start the A2A HTTP server
   */
  async start(): Promise<void> {
    console.log('[Relationship Agent A2A] Starting server...');

    // Initialize agent
    await this.agent.init();

    // Create Express app with JSON-RPC transport
    const app = this.transport.createApp();

    // Serve Agent Card at /.well-known/agent-card.json
    app.get('/.well-known/agent-card.json', (_req, res) => {
      res.json(this.agentCard);
    });

    // Start HTTP server
    this.server = app.listen(this.config.port, () => {
      console.log(`[Relationship Agent A2A] Server listening on ${this.config.baseUrl}`);
      console.log(
        `[Relationship Agent A2A] Agent Card: ${this.config.baseUrl}/.well-known/agent-card.json`
      );
      console.log(`[Relationship Agent A2A] Health check: ${this.config.baseUrl}/health`);
    });
  }

  /**
   * Stop the A2A HTTP server
   */
  async stop(): Promise<void> {
    console.log('[Relationship Agent A2A] Shutting down...');

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server?.close(() => resolve());
      });
    }

    await this.agent.shutdown();
    console.log('[Relationship Agent A2A] Server stopped');
    process.exit(0);
  }
}

async function main(): Promise<void> {
  const server = new RelationshipAgentA2AServer({
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
  console.error('Fatal error starting Relationship Agent A2A Server:', error);
  process.exit(1);
}
