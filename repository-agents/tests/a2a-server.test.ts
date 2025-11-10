/**
 * Repository Agents A2A Server Integration Tests
 *
 * Tests A2A Protocol v0.3.0 compliance for Repository Agents
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test configuration
const BASE_URL = 'http://localhost:3003';
const AGENT_CARD_URL = `${BASE_URL}/.well-known/agent-card.json`;
const HEALTH_URL = `${BASE_URL}/health`;
const RPC_URL = BASE_URL;

// Server process handle
let serverProcess: ReturnType<typeof exec> | null = null;

// Agent Card interface for validation
interface AgentCard {
  id: string;
  name: string;
  description: string;
  version: string;
  capabilities: {
    streaming?: boolean;
    multiModal?: boolean;
  };
  transports: Array<{
    type: string;
    url: string;
    protocol: string;
  }>;
  skills?: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

/**
 * Start the Repository Agents A2A server before tests
 */
beforeAll(async () => {
  console.log('Starting Repository Agents A2A server...');

  // Start server in background
  const cwd = new URL('../', import.meta.url).pathname.slice(1); // Remove leading slash on Windows
  serverProcess = exec('npx tsx src/a2a-server.ts', { cwd });

  // Wait for server to be ready (check health endpoint)
  let ready = false;
  let attempts = 0;
  const maxAttempts = 30; // 15 seconds

  while (!ready && attempts < maxAttempts) {
    try {
      const response = await fetch(HEALTH_URL);
      if (response.ok) {
        ready = true;
        console.log('Repository Agents A2A server is ready');
      }
    } catch {
      // Server not ready yet
      await new Promise((resolve) => setTimeout(resolve, 500));
      attempts++;
    }
  }

  if (!ready) {
    throw new Error('Repository Agents A2A server failed to start within timeout');
  }
}, 30000); // 30 second timeout for startup

/**
 * Stop the server after all tests
 */
afterAll(async () => {
  console.log('Stopping Repository Agents A2A server...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    // Give it time to shut down gracefully
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
});

/**
 * Helper function to make JSON-RPC request
 */
async function rpcRequest(method: string, params: unknown = {}) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Math.random().toString(36).substring(7),
      method,
      params,
    }),
  });

  return response.json();
}

describe('Repository Agents A2A Server - Health and Discovery', () => {
  it('should respond to health check endpoint', async () => {
    const response = await fetch(HEALTH_URL);
    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('healthy');
  });

  it('should serve Agent Card at /.well-known/agent-card.json', async () => {
    const response = await fetch(AGENT_CARD_URL);
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toContain('application/json');

    const agentCard = (await response.json()) as AgentCard;
    expect(agentCard).toHaveProperty('id');
    expect(agentCard).toHaveProperty('name');
    expect(agentCard).toHaveProperty('description');
    expect(agentCard).toHaveProperty('transports');
    expect(Array.isArray(agentCard.transports)).toBe(true);
  });

  it('should have required skills in Agent Card', async () => {
    const response = await fetch(AGENT_CARD_URL);
    const agentCard = (await response.json()) as AgentCard;

    expect(agentCard.skills).toBeDefined();
    expect(Array.isArray(agentCard.skills)).toBe(true);
    expect(agentCard.skills!.length).toBeGreaterThan(0);

    // Check that skills have proper structure
    const skillIds = agentCard.skills?.map((s) => s.id);
    expect(skillIds).toContain('analyze-repository');
    expect(skillIds).toContain('extract-dependencies');
  });

  it('should have HTTP transport in Agent Card', async () => {
    const response = await fetch(AGENT_CARD_URL);
    const agentCard = (await response.json()) as AgentCard;

    const httpTransport = agentCard.transports.find((t) => t.type === 'http');
    expect(httpTransport).toBeDefined();
    expect(httpTransport?.protocol).toBe('json-rpc-2.0');
    expect(httpTransport?.url).toBe(BASE_URL);
  });
});

describe('Repository Agents A2A Server - JSON-RPC Protocol', () => {
  it('should handle valid JSON-RPC 2.0 request', async () => {
    const result = await rpcRequest('tasks/get', { taskId: 'non-existent-task' });

    // Should get an error (task not found), but it's a valid JSON-RPC response
    expect(result).toHaveProperty('jsonrpc');
    expect(result.jsonrpc).toBe('2.0');
    expect(result).toHaveProperty('id');
  });

  it('should reject request without jsonrpc field', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '1',
        method: 'tasks/get',
        params: {},
      }),
    });

    const result = await response.json();
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32600); // Invalid Request
  });

  it('should reject request without method field', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        params: {},
      }),
    });

    const result = await response.json();
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32600); // Invalid Request
  });

  it('should reject unknown method', async () => {
    const result = await rpcRequest('unknown/method', {});
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32601); // Method not found
  });

  it('should handle malformed JSON', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{',
    });

    // Express returns HTML error page for malformed JSON, not JSON response
    expect(response.ok).toBe(false);
  });
});

describe('Repository Agents A2A Server - Task Management', () => {
  it('should create task when sending message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: owner/repo' }],
      },
    });

    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('task');
    expect(result.result.task).toHaveProperty('id');
    expect(result.result.task).toHaveProperty('status');
  });

  it('should retrieve task by ID', async () => {
    // First create a task
    const createResult = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: test/repo' }],
      },
    });

    const taskId = createResult.result.task.id;

    // Then retrieve it
    const getResult = await rpcRequest('tasks/get', { taskId });
    expect(getResult).toHaveProperty('result');
    expect(getResult.result).toHaveProperty('task');
    expect(getResult.result.task.id).toBe(taskId);
  });

  it('should fail to retrieve non-existent task', async () => {
    const result = await rpcRequest('tasks/get', { taskId: 'non-existent-task-id-12345' });
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32602); // JSON-RPC INVALID_PARAMS for invalid task ID
  });

  it('should track task status changes', async () => {
    const createResult = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: history/test' }],
      },
    });

    const task = createResult.result.task;
    expect(task.status).toHaveProperty('state');
    expect(task.status).toHaveProperty('message');
    expect(task.status.state).toBe('working');
  });

  it('should cancel task', async () => {
    // Create a task
    const createResult = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: cancel/test' }],
      },
    });

    const taskId = createResult.result.task.id;

    // Cancel it
    const cancelResult = await rpcRequest('tasks/cancel', {
      taskId,
      reason: 'Test cancellation',
    });

    expect(cancelResult).toHaveProperty('result');
    expect(cancelResult.result).toHaveProperty('task');
    expect(cancelResult.result.task.status.state).toBe('canceled'); // US spelling
  });
});

describe('Repository Agents A2A Server - Message Handling', () => {
  it('should handle analyze repository message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: owner/repo' }],
      },
    });

    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should handle extract endpoints message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'extract endpoints: owner/api-repo' }],
      },
    });

    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should handle search dependencies message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search dependencies: express' }],
      },
    });

    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should handle detect type message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'detect type: owner/repo' }],
      },
    });

    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should reject message without parts', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [],
      },
    });

    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32602); // Invalid params (empty parts array)
  });

  it('should handle message with multiple text parts', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          { type: 'text', text: 'analyze' },
          { type: 'text', text: ' repository: owner/repo' },
        ],
      },
    });

    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });
});

describe('Repository Agents A2A Server - Error Handling', () => {
  it('should return proper error for invalid params', async () => {
    const result = await rpcRequest('tasks/get', {}); // Missing taskId
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32602); // JSON-RPC INVALID_PARAMS for missing taskId
  });

  it('should handle task continuation with taskId', async () => {
    // Create initial task
    const createResult = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: continue/test' }],
      },
    });

    const taskId = createResult.result.task.id;

    // Continue the task
    const continueResult = await rpcRequest('message/send', {
      taskId,
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'extract endpoints: continue/test' }],
      },
    });

    expect(continueResult.result).toHaveProperty('task');
    expect(continueResult.result.task.id).toBe(taskId);
  });
});

describe('Repository Agents A2A Server - CORS and Headers', () => {
  it('should have CORS headers', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '1',
        method: 'tasks/get',
        params: { taskId: 'test' },
      }),
    });

    expect(response.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('should handle OPTIONS preflight request', async () => {
    const response = await fetch(RPC_URL, {
      method: 'OPTIONS',
    });

    expect(response.status).toBe(200); // Express default behavior
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });
});
