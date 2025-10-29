import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { appConfig } from './config/index.js';

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

// Health check route
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      postgres: 'up', // TODO: Add actual health checks
      neo4j: 'up',
    },
  };
});

// Root route
fastify.get('/', async () => {
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
    console.log(`\n🚀 Server listening on port ${appConfig.PORT}`);
    console.log(`   Environment: ${appConfig.NODE_ENV}`);
    console.log(`   Health check: http://localhost:${appConfig.PORT}/health\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
