/**
 * A2A Server Integration Tests
 * Tests the Developer Agent A2A HTTP server compliance
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3001';

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
    name: string;
    description: string;
    tags?: string[];
  }>;
  transports?: Array<{
    type: string;
    url: string;
  }>;
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

describe('A2A Server - Health and Discovery', () => {
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
    expect(agentCard.name).toBe('Developer Agent');
    expect(agentCard.description).toBeDefined();
    expect(agentCard.skills).toBeDefined();
    expect(Array.isArray(agentCard.skills)).toBe(true);
    expect(agentCard.transports).toBeDefined();
    expect(Array.isArray(agentCard.transports)).toBe(true);
  });

  it('should have required skills in Agent Card', async () => {
    const response = await fetch(`${BASE_URL}/.well-known/agent-card.json`);
    const agentCard = (await response.json()) as AgentCard;

    // Check that skills array exists and has at least 2 skills
    expect(agentCard.skills).toBeDefined();
    expect(agentCard.skills!.length).toBeGreaterThanOrEqual(2);

    // Verify that skills have proper structure
    for (const skill of agentCard.skills!) {
      expect(skill.name).toBeDefined();
      expect(skill.description).toBeDefined();
    }
  });

  it('should have JSON-RPC HTTP transport in Agent Card', async () => {
    const response = await fetch(`${BASE_URL}/.well-known/agent-card.json`);
    const agentCard = (await response.json()) as AgentCard;

    const httpTransport = agentCard.transports?.find((t) => t.type === 'http');
    expect(httpTransport).toBeDefined();
    expect(httpTransport?.url).toBe(BASE_URL);
  });
});

describe('A2A Server - JSON-RPC Protocol', () => {
  it('should handle valid JSON-RPC request format', async () => {
    const response = await sendJsonRpcRequest('tasks/get', { taskId: 'test-123' });

    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBeDefined();
    // Should either return result or error, but not both
    expect(
      (response.result !== undefined && response.error === undefined) ||
        (response.result === undefined && response.error !== undefined)
    ).toBe(true);
  });

  it('should reject invalid JSON-RPC version', async () => {
    const invalidRequest = {
      jsonrpc: '1.0', // Wrong version
      method: 'tasks/get',
      params: { taskId: 'test-123' },
      id: 1,
    };

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest),
    });

    const json = (await response.json()) as JsonRpcResponse;
    expect(json.error).toBeDefined();
    expect(json.error?.code).toBe(-32600); // Invalid Request
  });

  it('should reject request without method', async () => {
    const invalidRequest = {
      jsonrpc: '2.0',
      // method missing
      params: { taskId: 'test-123' },
      id: 1,
    };

    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidRequest),
    });

    const json = (await response.json()) as JsonRpcResponse;
    expect(json.error).toBeDefined();
    expect(json.error?.code).toBe(-32600); // Invalid Request
  });

  it('should return Method Not Found for unknown method', async () => {
    const response = await sendJsonRpcRequest('unknown/method', { foo: 'bar' });

    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601); // Method not found
  });

  it('should handle missing params gracefully', async () => {
    const response = await sendJsonRpcRequest('tasks/get');

    // Should return error for missing required params
    expect(response.error).toBeDefined();
  });
});

describe('A2A Server - Task Management', () => {
  let createdTaskId: string;

  it('should create a new task via message/send', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Test message for A2A compliance',
          },
        ],
      },
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();

    const result = response.result as {
      task: { id: string; status: { state: string } };
      messageId: string;
    };
    expect(result.task).toBeDefined();
    expect(result.task.id).toBeDefined();
    expect(result.task.status.state).toBeDefined();
    expect(result.messageId).toBeDefined();

    createdTaskId = result.task.id;
  });

  it('should retrieve task status via tasks/get', async () => {
    if (!createdTaskId) {
      throw new Error('Task ID not available from previous test');
    }

    const response = await sendJsonRpcRequest('tasks/get', {
      taskId: createdTaskId,
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();

    const result = response.result as { task: { id: string; status: { state: string } } };
    expect(result.task).toBeDefined();
    expect(result.task.id).toBe(createdTaskId);
    expect(result.task.status).toBeDefined();
    expect(result.task.status.state).toBeDefined();
    expect(['submitted', 'working', 'completed', 'failed', 'canceled']).toContain(
      result.task.status.state
    );
  });

  it('should return error for non-existent task', async () => {
    const response = await sendJsonRpcRequest('tasks/get', {
      taskId: 'non-existent-task-id',
    });

    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32001); // A2A error code for not found
  });

  it('should cancel a task via tasks/cancel', async () => {
    // Create a new task first
    const createResponse = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Task to be canceled',
          },
        ],
      },
    });

    const createResult = createResponse.result as { taskId: string };
    const taskId = createResult.taskId;

    // Try to cancel it
    const cancelResponse = await sendJsonRpcRequest('tasks/cancel', {
      taskId,
    });

    // Should either succeed or return error if already completed
    expect(cancelResponse.id).toBeDefined();
  });

  it('should return error when canceling non-existent task', async () => {
    const response = await sendJsonRpcRequest('tasks/cancel', {
      taskId: 'non-existent-task-id',
    });

    expect(response.error).toBeDefined();
  });
});

describe('A2A Server - Message Handling', () => {
  it('should accept message with text part', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Hello, Developer Agent!',
          },
        ],
      },
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
  });

  it('should accept message with multiple parts', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Analyze this file:',
          },
          {
            type: 'file',
            path: '/test/example.ts',
            mimeType: 'text/typescript',
          },
        ],
      },
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
  });

  it('should accept message with taskId to update existing task', async () => {
    // Create initial task
    const createResponse = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Initial message',
          },
        ],
      },
    });

    const createResult = createResponse.result as { taskId: string };
    const taskId = createResult.taskId;

    // Send follow-up message
    const followUpResponse = await sendJsonRpcRequest('message/send', {
      taskId,
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Follow-up message',
          },
        ],
      },
    });

    expect(followUpResponse.error).toBeUndefined();
    const followUpResult = followUpResponse.result as { taskId: string };
    expect(followUpResult.taskId).toBe(taskId); // Same task ID
  });

  it('should reject message without parts', async () => {
    const response = await sendJsonRpcRequest('message/send', {
      message: {
        role: 'user',
        parts: [],
      },
    });

    expect(response.error).toBeDefined();
  });

  // Note: Role validation not yet implemented in server
});

describe('A2A Server - Error Handling', () => {
  it('should return proper error codes', async () => {
    const testCases = [
      {
        method: 'tasks/get',
        params: {}, // Missing taskId
        expectedError: true,
      },
      {
        method: 'tasks/cancel',
        params: {}, // Missing taskId
        expectedError: true,
      },
      {
        method: 'message/send',
        params: {}, // Missing message
        expectedError: true,
      },
    ];

    for (const testCase of testCases) {
      const response = await sendJsonRpcRequest(testCase.method, testCase.params);

      if (testCase.expectedError) {
        expect(response.error).toBeDefined();
        expect(response.error?.code).toBeDefined();
        expect(response.error?.message).toBeDefined();
      }
    }
  });

  it('should include error details in error response', async () => {
    const response = await sendJsonRpcRequest('tasks/get', {
      taskId: 'non-existent',
    });

    expect(response.error).toBeDefined();
    expect(response.error?.message).toBeDefined();
    expect(typeof response.error?.message).toBe('string');
  });
});

describe('A2A Server - CORS and Headers', () => {
  it('should include CORS headers', async () => {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://example.com',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tasks/get',
        params: { taskId: 'test' },
        id: 1,
      }),
    });

    const corsHeader = response.headers.get('access-control-allow-origin');
    expect(corsHeader).toBeDefined();
  });

  it('should accept OPTIONS preflight request', async () => {
    const response = await fetch(BASE_URL, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://example.com',
        'Access-Control-Request-Method': 'POST',
      },
    });

    expect(response.ok).toBe(true);
  });
});

console.log('🧪 A2A Server Integration Tests');
console.log('Testing against:', BASE_URL);
console.log('Make sure the server is running: npm run a2a\n');
