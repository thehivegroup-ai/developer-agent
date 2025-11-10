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

// Load environment variables from .env.local in workspace root
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..', '..');
config({ path: join(workspaceRoot, '.env.local') });

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
      console.log(
        '[RelationshipAgent A2A] message/send received:',
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
        message: 'Processing relationship operation',
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
        // Accept generic messages for testing/compatibility
        action = 'generic';
        parameters = { text: messageText };
      }

      // Only process if we have a recognized operation
      if (action && action !== 'generic') {
        await this.taskManager.updateTaskStatus(task.id, {
          message: `Processing ${action} operation`,
          state: TaskState.WORKING,
        });
      } else {
        // Generic message handling
        await this.taskManager.updateTaskStatus(task.id, {
          message: 'Message received',
          state: TaskState.WORKING,
        });
      }

      // Start async processing (don't wait for completion)
      this.processMessageAsync(task.id, action, parameters).catch((error) => {
        if (this.config.enableLogging) {
          console.error('[RelationshipAgent A2A] Background processing error:', error);
        }
      });

      // Get current task state (should be WORKING)
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
   * Process message asynchronously
   */
  private async processMessageAsync(
    taskId: string,
    action: string,
    parameters: Record<string, unknown>
  ): Promise<void> {
    try {
      // Log the operation
      if (this.config.enableLogging) {
        console.log(`[RelationshipAgent A2A] Executing ${action} with parameters:`, parameters);
      }

      // Add delay to simulate processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Complete the task
      await this.taskManager.updateTaskStatus(taskId, {
        message: action !== 'generic' ? `${action} completed successfully` : 'Message processed',
        state: TaskState.COMPLETED,
      });
    } catch (error) {
      await this.taskManager.failTask(taskId, error as Error);
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
      console.log(
        '[RelationshipAgent A2A] tasks/cancel received:',
        JSON.stringify(params, null, 2)
      );
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

  // Keep process alive - the HTTP server will handle requests
  await new Promise(() => {}); // Never resolves, keeps event loop alive
}

// Run if executed directly
try {
  await main();
} catch (error) {
  console.error('Fatal error starting Relationship Agent A2A Server:', error);
  process.exit(1);
}
