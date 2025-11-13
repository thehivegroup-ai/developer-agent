/**
 * Repository Agents A2A Server
 *
 * Implements A2A Protocol v0.3.0 compliance for Repository Agents using @a2a-js/sdk.
 * Provides HTTP endpoints for repository analysis via JSON-RPC 2.0.
 */

// Load environment variables from .env.local in workspace root
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const workspaceRoot = join(__dirname, '..', '..');
config({ path: join(workspaceRoot, '.env.local') });

import express from 'express';
import type { AgentCard } from '@a2a-js/sdk';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  DefaultExecutionEventBusManager,
} from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import { NodeApiAgent } from './NodeApiAgent.js';
import { RepositoryAgentExecutor } from './executors/index.js';

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
  private readonly executor: RepositoryAgentExecutor;
  private readonly config: Required<RepositoryAgentsA2AServerConfig>;
  private readonly agentCard: AgentCard;
  private app?: express.Application;
  private server?: ReturnType<typeof express.application.listen>;
  private requestHandler?: DefaultRequestHandler;
  private taskStore?: InMemoryTaskStore;
  private eventBusManager?: DefaultExecutionEventBusManager;

  constructor(config: RepositoryAgentsA2AServerConfig = {}) {
    this.config = {
      port: config.port ?? 3003,
      enableLogging: config.enableLogging ?? false,
      baseUrl: config.baseUrl ?? `http://localhost:${config.port ?? 3003}`,
    };

    // Create Agent Card following @a2a-js SDK format
    this.agentCard = {
      version: '1.0.0',
      name: 'Repository Agent',
      description:
        'Specialized agent for repository analysis including technology detection, dependency analysis, and code structure evaluation.',
      url: this.config.baseUrl,
      protocolVersion: '0.3.0',
      capabilities: {},
      defaultInputModes: ['text/plain', 'application/json'],
      defaultOutputModes: ['text/plain', 'application/json'],
      skills: [
        {
          id: 'repository-analysis',
          name: 'Repository Analysis',
          description: 'Technology detection, dependency analysis, and code structure evaluation',
          tags: ['repository', 'analysis', 'technology-detection'],
        },
      ],
      provider: {
        organization: 'TheHiveGroup AI',
        url: 'https://github.com/thehivegroup-ai',
      },
    };

    // Initialize agent and executor
    this.agent = new NodeApiAgent('node-api');
    this.executor = new RepositoryAgentExecutor(this.agent);
  }

  /**
   * Start the HTTP server.
   *
   * @returns Promise that resolves when server is listening
   */
  async start(): Promise<void> {
    // Initialize agent
    await this.agent.init();

    // Create @a2a-js components
    this.taskStore = new InMemoryTaskStore();
    this.eventBusManager = new DefaultExecutionEventBusManager();
    this.requestHandler = new DefaultRequestHandler(
      this.agentCard,
      this.taskStore,
      this.executor,
      this.eventBusManager
    );

    // Create Express app
    this.app = express();
    this.app.use(express.json());

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Setup A2A routes using @a2a-js SDK
    const a2aApp = new A2AExpressApp(this.requestHandler);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    a2aApp.setupRoutes(this.app as any); // Type assertion needed - Express vs Application type mismatch

    // Start server
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app!.listen(this.config.port, () => {
          console.log(`[RepositoryAgent A2A] Server listening on ${this.config.baseUrl}`);
          console.log(
            `[RepositoryAgent A2A] Agent Card: ${this.config.baseUrl}/.well-known/agent-card.json`
          );
          console.log(`[RepositoryAgent A2A] Health check: ${this.config.baseUrl}/health`);
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

    // Cleanup executor
    await this.executor.destroy();

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
        } else {
          console.log('[RepositoryAgent A2A] Server stopped');
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
   * Get the request handler (for testing).
   */
  getRequestHandler(): DefaultRequestHandler | undefined {
    return this.requestHandler;
  }

  /**
   * Get the agent instance (for testing).
   */
  getAgent(): NodeApiAgent {
    return this.agent;
  }
}

/**
 * Main entry point for standalone execution.
 */
async function main(): Promise<void> {
  console.log('🚀 Repository Agent A2A Server starting...');
  const server = new RepositoryAgentsA2AServer({
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

// Run if this is the main module
// When running with tsx or node --import, process.argv[1] may be undefined
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1] === undefined ||
  import.meta.url.endsWith(process.argv[1]?.replaceAll('\\', '/') || '');

if (isMainModule) {
  await main().catch((error) => {
    console.error('Failed to start Repository Agent A2A server:', error);
    process.exit(1);
  });
}
