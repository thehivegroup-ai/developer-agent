/**
 * Relationship Agent A2A Server Tests
 *
 * Comprehensive test suite for A2A Protocol v0.3.0 compliance.
 * Tests all RPC methods, task management, and error handling.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = 'http://localhost:3004';
const RPC_URL = BASE_URL; // JsonRpcTransport handles POST to root path
const AGENT_CARD_URL = `${BASE_URL}/.well-known/agent-card.json`;
const HEALTH_URL = `${BASE_URL}/health`;

let serverProcess: any;

/**
 * Helper function to make JSON-RPC 2.0 requests
 */
async function rpcRequest(method: string, params: any = {}) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  return response.json();
}

// Start server before tests
beforeAll(async () => {
  console.log('Starting Relationship Agent A2A server...');

  const { spawn } = await import('child_process');
  const isWindows = process.platform === 'win32';
  
  // Use npx tsx directly instead of npm run to avoid Windows spawn issues
  serverProcess = spawn(isWindows ? 'npx.cmd' : 'npx', ['tsx', 'src/a2a-server.ts'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    shell: isWindows,
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server startup timeout')), 30000);

    const checkServer = async () => {
      try {
        const response = await fetch(HEALTH_URL);
        if (response.ok) {
          clearTimeout(timeout);
          console.log('Relationship Agent A2A server is ready');
          resolve();
        } else {
          setTimeout(() => void checkServer(), 500);
        }
      } catch {
        setTimeout(() => void checkServer(), 500);
      }
    };

    void checkServer();
  });
}, 40000);

// Stop server after tests
afterAll(async () => {
  console.log('Stopping Relationship Agent A2A server...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
});

describe('Relationship Agent A2A Server - Health and Discovery', () => {
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
    const agentCard = await response.json();
    expect(agentCard).toHaveProperty('name');
    expect(agentCard).toHaveProperty('version');
    expect(agentCard).toHaveProperty('skills');
    expect(agentCard).toHaveProperty('transports'); // Changed from 'transport' to 'transports' (plural)
  });

  it('should have required skills in Agent Card', async () => {
    const response = await fetch(AGENT_CARD_URL);
    const agentCard = await response.json();
    expect(Array.isArray(agentCard.skills)).toBe(true);
    expect(agentCard.skills.length).toBeGreaterThan(0);
  });

  it('should have HTTP transport in Agent Card', async () => {
    const response = await fetch(AGENT_CARD_URL);
    const agentCard = await response.json();
    expect(Array.isArray(agentCard.transports)).toBe(true); // transports is an array
    const httpTransport = agentCard.transports.find((t: any) => t.type === 'http');
    expect(httpTransport).toBeDefined();
    expect(httpTransport.type).toBe('http');
    expect(httpTransport).toHaveProperty('url');
  });
});

describe('Relationship Agent A2A Server - JSON-RPC Protocol', () => {
  it('should handle valid JSON-RPC 2.0 request', async () => {
    const result = await rpcRequest('tasks/get', { taskId: 'non-existent' });
    expect(result).toHaveProperty('jsonrpc');
    expect(result.jsonrpc).toBe('2.0');
    expect(result).toHaveProperty('id');
    // Will have error since task doesn't exist, but validates protocol
  });

  it('should reject request without jsonrpc field', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 1, method: 'tasks/get', params: {} }),
    });

    const result = await response.json();
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32600); // Invalid Request
  });

  it('should reject request without method field', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, params: {} }),
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

describe('Relationship Agent A2A Server - Task Management', () => {
  it('should create task when sending message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'build graph: test repositories' }],
      },
    });

    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('task');
    expect(result.result.task).toHaveProperty('id');
    expect(result.result.task).toHaveProperty('status');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should retrieve task by ID', async () => {
    // Create a task first
    const createResult = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze relationships: test query' }],
      },
    });

    const taskId = createResult.result.task.id;

    // Retrieve the task
    const getResult = await rpcRequest('tasks/get', { taskId });

    expect(getResult).toHaveProperty('result');
    expect(getResult.result).toHaveProperty('task');
    expect(getResult.result.task.id).toBe(taskId);
  });

  it('should fail to retrieve non-existent task', async () => {
    const result = await rpcRequest('tasks/get', { taskId: 'non-existent-task-id-12345' });
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32001); // UNSUPPORTED_MESSAGE_FORMAT (task validation error)
  });

  it('should track task status changes', async () => {
    const createResult = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'find connections: test query' }],
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
        parts: [{ type: 'text', text: 'track dependency: test description' }],
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

describe('Relationship Agent A2A Server - Message Handling', () => {
  it('should handle build graph message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'build graph: analyze project dependencies' }],
      },
    });

    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should handle analyze relationships message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze relationships: user to order' }],
      },
    });

    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should handle find connections message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'find connections: service A to service B' }],
      },
    });

    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('task');
    expect(result.result.task.status.state).toBe('working');
  });

  it('should handle track dependency message', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'track dependency: frontend depends on API' }],
      },
    });

    expect(result).toHaveProperty('result');
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
    expect(result.error.code).toBe(-32005); // INVALID_MESSAGE (validation error)
  });

  it('should handle message with multiple text parts', async () => {
    const result = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          { type: 'text', text: 'build graph:' },
          { type: 'text', text: ' test repositories' },
        ],
      },
    });

    expect(result).toHaveProperty('result');
    expect(result.result).toHaveProperty('task');
  });
});

describe('Relationship Agent A2A Server - Error Handling', () => {
  it('should return proper error for invalid params', async () => {
    const result = await rpcRequest('tasks/get', {}); // Missing taskId
    expect(result).toHaveProperty('error');
    expect(result.error.code).toBe(-32001); // Validation error (UNSUPPORTED_MESSAGE_FORMAT)
  });

  it('should handle task continuation with taskId', async () => {
    // Create initial task
    const createResult = await rpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'build graph: initial' }],
      },
    });

    const taskId = createResult.result.task.id;

    // Continue the task
    const continueResult = await rpcRequest('message/send', {
      taskId,
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'build graph: continued' }],
      },
    });

    expect(continueResult).toHaveProperty('result');
    expect(continueResult.result.task.id).toBe(taskId);
  });
});

describe('Relationship Agent A2A Server - CORS and Headers', () => {
  it('should have CORS headers', async () => {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tasks/get',
        params: { taskId: 'test' },
      }),
    });

    expect(response.headers.has('access-control-allow-origin')).toBe(true);
  });

  it('should handle OPTIONS preflight request', async () => {
    const response = await fetch(RPC_URL, {
      method: 'OPTIONS',
    });

    expect(response.status).toBe(200); // Express default behavior
    expect(response.headers.get('access-control-allow-methods')).toContain('POST');
  });
});
