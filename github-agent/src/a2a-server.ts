/**
 * GitHub Agent A2A Server
 *
 * Implements A2A Protocol v0.3.0 compliance for GitHub Agent.
 * Provides HTTP endpoints for repository discovery and analysis via JSON-RPC 2.0.
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
      enableLogging: config.enableLogging ?? false, // Disabled by default - too verbose
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
    // Reduced logging: Only log in development if explicitly enabled
    // if (this.config.enableLogging) {
    //   console.log('[GitHubAgent A2A] message/send received:', JSON.stringify(params, null, 2));
    // }

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
        message: 'Processing GitHub operation',
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
      await this.taskManager.startTask(task.id, 'Processing GitHub operation');
    }

    try {
      // First check for data parts containing structured parameters (from A2A proxy)
      const dataParts = a2aMessage.parts.filter((part) => part.type === 'data');
      const textParts = a2aMessage.parts.filter(isTextPart);
      const messageText = textParts.map((part) => part.text).join('\n');

      let action: string;
      let parameters: Record<string, unknown> = {};

      // Check if we have structured data from A2A proxy
      if (dataParts.length > 0 && dataParts[0]?.data) {
        const structuredData = dataParts[0].data as Record<string, unknown>;

        // Extract action and parameters from data part
        if (structuredData.action) {
          action = structuredData.action as string;
          // Copy all other fields as parameters (owner, repo, etc.)
          parameters = { ...structuredData };
          delete parameters.action; // Remove action from parameters
        } else {
          // Data part without action - treat as parameters for discover
          action = 'discover';
          parameters = structuredData;
        }
      } else if (!messageText) {
        throw createA2AError(
          A2AErrorCode.UNSUPPORTED_MESSAGE_FORMAT,
          'Message must contain at least one text part or data part'
        );
      } else {
        // Fall back to text-based parsing (legacy format)
        // Expected formats:
        // - "search repositories: <query>"
        // - "discover repository: <owner>/<repo>"
        // - "analyze repository: <owner>/<repo>"
        // - "detect repository type: <owner>/<repo>"

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
      }

      // Process message with GitHub Agent
      await this.taskManager.updateTaskStatus(task.id, {
        message: `Processing ${action} operation`,
        state: TaskState.WORKING,
      });

      // Reduced logging: Only log action, not full parameters
      // if (this.config.enableLogging) {
      //   console.log(`[GitHubAgent A2A] Executing ${action} with parameters:`, parameters);
      // }

      // Execute the action through the GitHub Agent asynchronously
      // Task will be polled for status via tasks/get
      void (async () => {
        try {
          // Add small delay for test cancellation (100ms)
          // In production, operations take longer naturally
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Check if task is still active before processing
          const currentTask = await this.taskManager.getTask(task.id);
          if (
            currentTask.status.state === TaskState.CANCELED ||
            currentTask.status.state === TaskState.FAILED ||
            currentTask.status.state === TaskState.COMPLETED
          ) {
            return; // Task already terminal, don't process
          }

          if (action === 'discover') {
            const discoveryResult = await this.agent.discoverRepositories(
              (parameters.query as string) || '',
              (parameters.limit as number) || 10
            );

            // Check again after async operation
            const taskAfterDiscovery = await this.taskManager.getTask(task.id);
            if (
              taskAfterDiscovery.status.state === TaskState.CANCELED ||
              taskAfterDiscovery.status.state === TaskState.FAILED ||
              taskAfterDiscovery.status.state === TaskState.COMPLETED
            ) {
              return; // Task was cancelled during execution
            }

            const repoCount = discoveryResult.repositories?.length || 0;
            const message = discoveryResult.error
              ? `Discovery completed with error: ${discoveryResult.error}`
              : `Discovered ${repoCount} repositories`;

            // Complete task with results stored in artifacts
            await this.taskManager.completeTask(task.id, message, [
              {
                id: `artifact-${Date.now()}`,
                name: 'discovery-results.json',
                mimeType: 'application/json',
                uri: `data:application/json,${encodeURIComponent(JSON.stringify(discoveryResult))}`,
                description: 'Repository discovery results',
              },
            ]);
          } else if (action === 'analyze') {
            // Analyze repository with owner and repo parameters
            const owner = parameters.owner as string;
            const repo = parameters.repo as string;

            if (!owner || !repo) {
              throw new Error('Missing required parameters: owner and repo');
            }

            const analysisResult = await this.agent.handleRequest({
              action: 'analyze',
              owner,
              repo,
            });

            // Check if task was cancelled during analysis
            const taskAfterAnalysis = await this.taskManager.getTask(task.id);
            if (
              taskAfterAnalysis.status.state === TaskState.CANCELED ||
              taskAfterAnalysis.status.state === TaskState.FAILED ||
              taskAfterAnalysis.status.state === TaskState.COMPLETED
            ) {
              return; // Task was cancelled during execution
            }

            const message = `Analyzed repository ${owner}/${repo}`;

            // Complete task with results stored in artifacts
            await this.taskManager.completeTask(task.id, message, [
              {
                id: `artifact-${Date.now()}`,
                name: 'analysis-results.json',
                mimeType: 'application/json',
                uri: `data:application/json,${encodeURIComponent(JSON.stringify(analysisResult))}`,
                description: 'Repository analysis results',
              },
            ]);
          } else {
            // For other actions, mark as not yet implemented
            await this.taskManager.completeTask(task.id, `Action '${action}' not yet implemented`);
          }
        } catch (actionError) {
          // Failed to execute action
          await this.taskManager.failTask(task.id, actionError as Error);
        }
      })();

      // Get updated task (will be in WORKING state initially)
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
    // Reduced logging: Only log in development if explicitly enabled
    // if (this.config.enableLogging) {
    //   console.log('[GitHubAgent A2A] tasks/get received:', JSON.stringify(params, null, 2));
    // }

    const task = await this.taskManager.getTask(params.taskId);

    return { task };
  }

  /**
   * Handle tasks/cancel RPC method.
   *
   * Cancels a running task.
   */
  private async handleTasksCancel(params: TasksCancelParams): Promise<TasksCancelResult> {
    // Reduced logging: Only log in development if explicitly enabled
    // if (this.config.enableLogging) {
    //   console.log('[GitHubAgent A2A] tasks/cancel received:', JSON.stringify(params, null, 2));
    // }

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
  console.log('🚀 GitHub Agent A2A Server starting...');
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

  // Keep process alive - the HTTP server will handle requests
  await new Promise(() => {}); // Never resolves, keeps event loop alive
}

// Run if executed directly
try {
  await main();
} catch (error) {
  console.error('Fatal error starting GitHub Agent A2A Server:', error);
  process.exit(1);
}
