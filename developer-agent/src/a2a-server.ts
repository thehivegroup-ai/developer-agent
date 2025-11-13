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
import { DeveloperAgent } from './index.js';
import { DeveloperAgentExecutor } from './executors/index.js';

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
  private readonly agentCard: AgentCard;
  private readonly agent: DeveloperAgent;
  private readonly executor: DeveloperAgentExecutor;
  private app?: express.Application;
  private server?: ReturnType<typeof express.application.listen>;
  private requestHandler?: DefaultRequestHandler;
  private taskStore?: InMemoryTaskStore;
  private eventBusManager?: DefaultExecutionEventBusManager;

  constructor(config: A2AServerConfig = {}) {
    this.config = {
      port: config.port || 3001,
      baseUrl: config.baseUrl || 'http://localhost:3001',
      enableLogging: config.enableLogging ?? false,
    };

    // Create Agent Card following @a2a-js SDK format
    this.agentCard = {
      version: '1.0.0', // Agent version
      name: 'Developer Agent',
      description:
        'Central orchestrator for analyzing GitHub repositories and building knowledge graphs. Decomposes complex tasks and coordinates specialized agents (GitHub, Repository, Relationship).',
      url: this.config.baseUrl,
      protocolVersion: '0.3.0',
      capabilities: {}, // Optional capabilities - using defaults
      defaultInputModes: ['text/plain', 'application/json'],
      defaultOutputModes: ['text/plain', 'application/json'],
      skills: [
        {
          id: 'analyze-repository',
          name: 'Repository Analysis',
          description: 'Analyze GitHub repositories and build knowledge graphs',
          tags: ['repository', 'analysis', 'knowledge-graph'],
        },
      ],
      provider: {
        organization: 'TheHiveGroup AI',
        url: 'https://github.com/thehivegroup-ai',
      },
    };

    // Initialize agent and executor
    this.agent = new DeveloperAgent();
    this.executor = new DeveloperAgentExecutor(this.agent);
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
   * Get the request handler (for testing).
   */
  getRequestHandler(): DefaultRequestHandler | undefined {
    return this.requestHandler;
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
    console.error('Failed to start Developer Agent A2A server:', error);
    process.exit(1);
  });
}
