/**
 * GitHub Agent A2A Server Integration Tests
 * Tests the GitHub Agent A2A HTTP server compliance
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'node:child_process';

const BASE_URL = 'http://localhost:3002';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
  id: string | number;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number | null;
}

interface AgentCard {
  id: string;
  name: string;
  description: string;
  version?: string;
  skills?: Array<{
    id: string;
    name: string;
    description: string;
    tags?: string[];
  }>;
  transports?: Array<{
    type: string;
    url: string;
  }>;
}

interface A2ATask {
  id: string;
  status: {
    state: string;
    message?: string;
    timestamp: string;
  };
  history: Array<{
    state: string;
    message?: string;
    timestamp: string;
  }>;
  artifacts: unknown[];
  contextId?: string;
  metadata?: Record<string, unknown>;
}

async function sendJsonRpcRequest(method: string, params?: unknown): Promise<JsonRpcResponse> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<JsonRpcResponse>;
}

async function waitForServer(maxAttempts = 20, delayMs = 500): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

let serverProcess: ReturnType<typeof exec> | null = null;

beforeAll(async () => {
  // Start the GitHub Agent A2A server
  console.log('Starting GitHub Agent A2A server...');
  serverProcess = exec('npx tsx src/a2a-server.ts', {
    cwd: new URL('../', import.meta.url).pathname.slice(1), // Get github-agent directory
  });

  // Wait for server to be ready
  const isReady = await waitForServer();
  if (!isReady) {
    throw new Error('GitHub Agent A2A server failed to start');
  }
  console.log('GitHub Agent A2A server is ready');
}, 30000);

afterAll(() => {
  // Stop the server
  if (serverProcess) {
    console.log('Stopping GitHub Agent A2A server...');
    serverProcess.kill();
  }
});

describe('GitHub Agent A2A Server - Health and Discovery', () => {
  it('should respond to health check endpoint', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    expect(response.ok).toBe(true);

    const data = (await response.json()) as {
      status: string;
      transport: string;
      methods: string[];
    };
    expect(data.status).toBe('healthy');
    expect(data.transport).toBe('json-rpc-2.0');
    expect(data.methods).toContain('message/send');
    expect(data.methods).toContain('tasks/get');
    expect(data.methods).toContain('tasks/cancel');
  });

  it('should serve Agent Card at /.well-known/agent-card.json', async () => {
    const response = await fetch(`${BASE_URL}/.well-known/agent-card.json`);
    expect(response.ok).toBe(true);

    const agentCard = (await response.json()) as AgentCard;

    // Validate Agent Card structure
    expect(agentCard.id).toBeDefined();
    expect(agentCard.name).toBe('GitHub Agent');
    expect(agentCard.description).toBeDefined();
    expect(agentCard.skills).toBeDefined();
    expect(Array.isArray(agentCard.skills)).toBe(true);
    expect(agentCard.transports).toBeDefined();
    expect(Array.isArray(agentCard.transports)).toBe(true);
  });

  it('should have required skills in Agent Card', async () => {
    const response = await fetch(`${BASE_URL}/.well-known/agent-card.json`);
    const agentCard = (await response.json()) as AgentCard;

    const skillIds = agentCard.skills?.map((s) => s.id) ?? [];
    expect(skillIds).toContain('search-repositories');
    expect(skillIds).toContain('discover-repository');
    expect(skillIds).toContain('analyze-repository');
    expect(skillIds).toContain('detect-repository-type');
  });

  it('should have HTTP transport in Agent Card', async () => {
    const response = await fetch(`${BASE_URL}/.well-known/agent-card.json`);
    const agentCard = (await response.json()) as AgentCard;

    const httpTransport = agentCard.transports?.find((t) => t.type === 'http');
    expect(httpTransport).toBeDefined();
    expect(httpTransport?.url).toBe('http://localhost:3002');
  });
});

describe('GitHub Agent A2A Server - JSON-RPC Protocol', () => {
  it('should handle valid JSON-RPC 2.0 request', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: test' }],
      },
    });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.result).toBeDefined();
  });

  it('should reject request without jsonrpc field', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'message/send',
        id: 1,
      }),
    });

    const data = (await response.json()) as JsonRpcResponse;
    expect(data.error).toBeDefined();
    expect(data.error?.code).toBe(-32600); // Invalid Request
  });

  it('should reject request without method field', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
      }),
    });

    const data = (await response.json()) as JsonRpcResponse;
    expect(data.error).toBeDefined();
    expect(data.error?.code).toBe(-32600); // Invalid Request
  });

  it('should reject unknown method', async () => {
    const response = await sendJsonRpcRequest('unknown/method', {});
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601); // Method not found
  });

  it('should handle malformed JSON', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{',
    });

    expect(response.status).toBe(400);
  });
});

describe('GitHub Agent A2A Server - Task Management', () => {
  it('should create task when sending message', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: typescript' }],
      },
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();

    const result = response.result as { task: A2ATask; messageId: string };
    expect(result.task).toBeDefined();
    expect(result.task.id).toBeDefined();
    expect(result.task.status).toBeDefined();
    expect(result.task.status.state).toBeDefined();
  });

  it('should retrieve task by ID', async () => {
    // First create a task
    const createResponse = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: react' }],
      },
    });

    const createResult = createResponse.result as { task: A2ATask };
    const taskId = createResult.task.id;

    // Now retrieve it
    const getResponse = await sendJsonRpcRequest('tasks/get', {
      taskId,
    });

    expect(getResponse.error).toBeUndefined();
    const getResult = getResponse.result as { task: A2ATask };
    expect(getResult.task.id).toBe(taskId);
  });

  it('should fail to retrieve non-existent task', async () => {
    const response = await sendJsonRpcRequest('tasks/get', {
      taskId: 'non-existent-task-id',
    });

    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32602); // JSON-RPC INVALID_PARAMS for invalid task ID
  });

  it('should track task history', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: node' }],
      },
    });

    const result = response.result as { task: A2ATask };
    expect(result.task.history).toBeDefined();
    expect(Array.isArray(result.task.history)).toBe(true);
    expect(result.task.history.length).toBeGreaterThan(0);
  });

  it('should cancel task', async () => {
    // Create a task
    const createResponse = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: vue' }],
      },
    });

    const createResult = createResponse.result as { task: A2ATask };
    const taskId = createResult.task.id;

    // Cancel it
    const cancelResponse = await sendJsonRpcRequest('tasks/cancel', {
      taskId,
      reason: 'Test cancellation',
    });

    expect(cancelResponse.error).toBeUndefined();
    const cancelResult = cancelResponse.result as { task: A2ATask };
    expect(cancelResult.task.status.state).toBe('canceled');
  });
});

describe('GitHub Agent A2A Server - Message Handling', () => {
  it('should handle search repositories message', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: python' }],
      },
    });

    expect(response.error).toBeUndefined();
    const result = response.result as { task: A2ATask; messageId: string };
    expect(result.messageId).toBeDefined();
    expect(result.task.status.state).toBeDefined();
  });

  it('should handle discover repository message', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'discover repository: microsoft/typescript' }],
      },
    });

    expect(response.error).toBeUndefined();
    const result = response.result as { task: A2ATask; messageId: string };
    expect(result.messageId).toBeDefined();
  });

  it('should handle analyze repository message', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: facebook/react' }],
      },
    });

    expect(response.error).toBeUndefined();
    const result = response.result as { task: A2ATask; messageId: string };
    expect(result.messageId).toBeDefined();
  });

  it('should handle detect repository type message', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'detect repository type: vuejs/vue' }],
      },
    });

    expect(response.error).toBeUndefined();
    const result = response.result as { task: A2ATask; messageId: string };
    expect(result.messageId).toBeDefined();
  });

  it('should reject message without parts', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [],
      },
    });

    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32602); // Invalid params (empty parts array)
  });

  it('should handle message with multiple text parts', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          { type: 'text', text: 'search repositories:' },
          { type: 'text', text: 'javascript' },
        ],
      },
    });

    expect(response.error).toBeUndefined();
  });
});

describe('GitHub Agent A2A Server - Error Handling', () => {
  it('should return proper error for invalid params', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      // Missing message field
    });

    expect(response.error).toBeDefined();
    expect(response.error?.code).toBeDefined();
  });

  it('should handle task continuation with taskId', async () => {
    // Create initial task
    const createResponse = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: angular' }],
      },
    });

    const createResult = createResponse.result as { task: A2ATask };
    const taskId = createResult.task.id;

    // Continue task
    const continueResponse = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze repository: angular/angular' }],
      },
      taskId,
    });

    expect(continueResponse.error).toBeUndefined();
    const continueResult = continueResponse.result as { task: A2ATask };
    expect(continueResult.task.id).toBe(taskId);
  });
});

describe('GitHub Agent A2A Server - CORS and Headers', () => {
  it('should have CORS headers', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const corsHeader = response.headers.get('access-control-allow-origin');
    expect(corsHeader).toBe('*');
  });

  it('should handle OPTIONS preflight request', async () => {
    const response = await fetch(BASE_URL, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    expect(response.ok).toBe(true);
    expect(response.headers.get('access-control-allow-methods')).toBeDefined();
  });
});
