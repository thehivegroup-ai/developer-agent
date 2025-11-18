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

import express from 'express';
import cors from 'cors';
import type { AgentCard } from '@a2a-js/sdk';
import {
  DefaultRequestHandler,
  InMemoryTaskStore,
  DefaultExecutionEventBusManager,
} from '@a2a-js/sdk/server';
import { A2AExpressApp } from '@a2a-js/sdk/server/express';
import { RelationshipAgent } from './index.js';
import { RelationshipAgentExecutor } from './executors/index.js';

/**
 * Configuration options for Relationship Agent A2A Server.
 */
interface RelationshipAgentA2AServerConfig {
  port?: number;
  enableLogging?: boolean;
  baseUrl?: string;
}

/**
 * A2A HTTP Server for Relationship Agent
 *
 * Implements the A2A Protocol v0.3.0 specification for knowledge graph operations.
 */
export class RelationshipAgentA2AServer {
  private readonly config: Required<RelationshipAgentA2AServerConfig>;
  private readonly agent: RelationshipAgent;
  private readonly agentCard: AgentCard;
  private readonly executor: RelationshipAgentExecutor;
  private app?: express.Application;
  private server?: ReturnType<typeof express.application.listen>;
  private requestHandler?: DefaultRequestHandler;
  private taskStore?: InMemoryTaskStore;
  private eventBusManager?: DefaultExecutionEventBusManager;

  constructor(config: RelationshipAgentA2AServerConfig = {}) {
    const port = config.port ?? 3004;
    this.config = {
      port,
      enableLogging: config.enableLogging ?? true,
      baseUrl: config.baseUrl ?? `http://localhost:${port}`,
    };

    // Initialize Relationship Agent
    this.agent = new RelationshipAgent();

    // Build Agent Card with @a2a-js format
    this.agentCard = {
      version: '1.0.0',
      name: 'Relationship Agent',
      description:
        'Specialized agent for relationship analysis including knowledge graphs, cross-repository relationships, and entity dependency tracking.',
      url: this.config.baseUrl,
      protocolVersion: '0.3.0',
      capabilities: {},
      defaultInputModes: ['text/plain', 'application/json'],
      defaultOutputModes: ['text/plain', 'application/json'],
      skills: [
        {
          id: 'build-knowledge-graph',
          name: 'Build Knowledge Graph',
          description: 'Build and maintain knowledge graphs of repository relationships',
          tags: ['knowledge-graph', 'graph-database', 'neo4j'],
        },
        {
          id: 'query-relationships',
          name: 'Query Relationships',
          description: 'Query and traverse relationship graphs to find connections',
          tags: ['relationships', 'query', 'graph-traversal'],
        },
        {
          id: 'relationship-analysis',
          name: 'Relationship Analysis',
          description:
            'Analyzes and maps relationships between code entities, repositories, and dependencies',
          tags: ['relationships', 'knowledge-graph', 'dependencies', 'entities'],
        },
      ],
      provider: {
        organization: 'TheHiveGroup AI',
        url: 'https://github.com/thehivegroup-ai',
      },
    };

    // Initialize executor with the agent instance
    this.executor = new RelationshipAgentExecutor(this.agent);
  }

  /**
   * Start the A2A server
   */
  async start(): Promise<void> {
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

    // Enable CORS for all routes
    this.app.use(
      cors({
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
      })
    );

    this.app.use(express.json());

    if (this.config.enableLogging) {
      this.app.use((req, _res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Setup A2A routes using @a2a-js SDK
    const a2aApp = new A2AExpressApp(this.requestHandler);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    a2aApp.setupRoutes(this.app as any); // Type assertion needed - Express vs Application type mismatch

    // Start server
    await new Promise<void>((resolve) => {
      this.server = this.app!.listen(this.config.port, () => {
        console.log(`Relationship Agent A2A Server listening on port ${this.config.port}`);
        console.log(`Agent Card available at: ${this.config.baseUrl}/.well-known/agent-card.json`);
        resolve();
      });
    });
  }

  /**
   * Stop the A2A server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.server = undefined;
    }

    // Note: RelationshipAgentExecutor doesn't have a cleanup method

    console.log('Relationship Agent A2A Server stopped');
  }

  /**
   * Get the Express app (for testing)
   */
  getApp(): express.Application | undefined {
    return this.app;
  }

  /**
   * Get the request handler (for testing)
   */
  getRequestHandler(): DefaultRequestHandler | undefined {
    return this.requestHandler;
  }

  /**
   * Get the agent instance (for testing)
   */
  getAgent(): RelationshipAgent {
    return this.agent;
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  // Use dedicated port 3004 (not PORT env var - that's for API Gateway on port 3000)
  const port = Number.parseInt(process.env.RELATIONSHIP_AGENT_PORT || '3004', 10);
  const server = new RelationshipAgentA2AServer({
    port,
    enableLogging: process.env.ENABLE_LOGGING !== 'false',
    baseUrl: process.env.RELATIONSHIP_AGENT_BASE_URL || `http://localhost:${port}`,
  });

  await server.start();

  // Graceful shutdown
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
    console.error('Failed to start Relationship Agent A2A server:', error);
    process.exit(1);
  });
}
