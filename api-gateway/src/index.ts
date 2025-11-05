import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { appConfig } from './config/index.js';
import { queryRoutes } from './routes/query.js';
import { chatRoutes } from './routes/chat.js';
import { websocketService } from './services/websocket-service.js';
import { getAgentService } from './services/agent-service.js';

const fastify = Fastify({
  logger: {
    level: appConfig.LOG_LEVEL,
  },
});

// Register plugins
await fastify.register(cors, {
  origin: true, // Allow all origins in development
});

await fastify.register(websocket);

// Register routes
await fastify.register(queryRoutes);
await fastify.register(chatRoutes);

// Health check route
fastify.get('/health', () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      postgres: 'up', // TODO: Add actual health checks
      neo4j: 'up',
      websocket: websocketService.getIO() ? 'up' : 'down',
    },
  };
});

// Root route
fastify.get('/', () => {
  return {
    name: 'A2A Multi-Agent System API',
    version: '0.1.0',
    documentation: '/docs',
  };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: appConfig.PORT,
      host: '0.0.0.0',
    });

    // Initialize WebSocket service with the HTTP server
    websocketService.initialize(fastify.server);

    // Initialize Agent service
    const agentService = getAgentService();
    await agentService.initialize();

    console.log(`\n🚀 Server listening on port ${appConfig.PORT}`);
    console.log(`   Environment: ${appConfig.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${appConfig.PORT}/health`);
    console.log(`   WebSocket endpoint: ws://localhost:${appConfig.PORT}/socket.io/\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

void start();
