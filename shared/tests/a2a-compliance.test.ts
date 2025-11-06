/**
 * A2A Protocol Compliance Test Suite
 *
 * This test suite validates that all agents properly implement the A2A Protocol v0.3.0.
 * It tests compliance across multiple agents to ensure they follow the same standards.
 *
 * Tests cover:
 * - Agent Card format and required fields
 * - JSON-RPC 2.0 protocol compliance
 * - Task lifecycle state transitions
 * - Error code standards
 * - HTTP endpoint availability
 */

import { describe, it, expect } from 'vitest';

/**
 * Agent configuration for compliance testing
 */
interface AgentConfig {
  name: string;
  baseUrl: string;
  expectedSkills: string[];
  minSkillCount: number;
}

/**
 * All agents that should be tested for A2A compliance
 */
const AGENTS: AgentConfig[] = [
  {
    name: 'Developer Agent',
    baseUrl: 'http://localhost:3001',
    expectedSkills: ['code-generation', 'refactoring', 'testing'],
    minSkillCount: 3,
  },
  {
    name: 'GitHub Agent',
    baseUrl: 'http://localhost:3002',
    expectedSkills: ['search-repositories', 'discover-repository', 'analyze-repository'],
    minSkillCount: 3,
  },
  {
    name: 'Repository Agents',
    baseUrl: 'http://localhost:3003',
    expectedSkills: ['analyze-repository', 'extract-endpoints'],
    minSkillCount: 2,
  },
  {
    name: 'Relationship Agent',
    baseUrl: 'http://localhost:3004',
    expectedSkills: ['build-graph', 'analyze-relationships'],
    minSkillCount: 2,
  },
];

/**
 * JSON-RPC 2.0 error codes
 */
const JSON_RPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

/**
 * A2A Task states from the protocol
 */
const TASK_STATES = {
  SUBMITTED: 'submitted',
  WORKING: 'working',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELED: 'canceled',
};

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
  owner?: {
    name: string;
    url?: string;
  };
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

/**
 * Send a JSON-RPC 2.0 request to an agent
 */
async function sendJsonRpcRequest(
  baseUrl: string,
  method: string,
  params?: unknown
): Promise<JsonRpcResponse> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  };

  const response = await fetch(baseUrl, {
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

/**
 * Fetch Agent Card from an agent
 */
async function fetchAgentCard(baseUrl: string): Promise<AgentCard> {
  const response = await fetch(`${baseUrl}/.well-known/agent-card.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch Agent Card: ${response.status}`);
  }
  return response.json() as Promise<AgentCard>;
}

describe('A2A Protocol Compliance - Agent Cards', () => {
  describe.each(AGENTS)(
    '$name Agent Card',
    ({ name: _name, baseUrl, expectedSkills, minSkillCount }) => {
      it('should serve Agent Card at /.well-known/agent-card.json', async () => {
        const card = await fetchAgentCard(baseUrl);
        expect(card).toBeDefined();
        expect(card.id).toBeDefined();
        expect(card.name).toBeDefined();
        expect(card.description).toBeDefined();
      });

      it('should have valid Agent Card structure', async () => {
        const card = await fetchAgentCard(baseUrl);

        // Required fields
        expect(typeof card.id).toBe('string');
        expect(card.id.length).toBeGreaterThan(0);
        expect(typeof card.name).toBe('string');
        expect(card.name.length).toBeGreaterThan(0);
        expect(typeof card.description).toBe('string');
        expect(card.description.length).toBeGreaterThan(0);

        // Optional but expected fields
        if (card.version) {
          expect(typeof card.version).toBe('string');
        }
        if (card.owner) {
          expect(typeof card.owner.name).toBe('string');
        }
      });

      it('should have at least minimum number of skills', async () => {
        const card = await fetchAgentCard(baseUrl);
        expect(card.skills).toBeDefined();
        expect(Array.isArray(card.skills)).toBe(true);
        expect(card.skills!.length).toBeGreaterThanOrEqual(minSkillCount);
      });

      it('should have valid skill definitions', async () => {
        const card = await fetchAgentCard(baseUrl);
        expect(card.skills).toBeDefined();

        for (const skill of card.skills!) {
          expect(typeof skill.id).toBe('string');
          expect(skill.id.length).toBeGreaterThan(0);
          expect(typeof skill.name).toBe('string');
          expect(skill.name.length).toBeGreaterThan(0);
          expect(typeof skill.description).toBe('string');
          expect(skill.description.length).toBeGreaterThan(0);

          if (skill.tags) {
            expect(Array.isArray(skill.tags)).toBe(true);
          }
        }
      });

      it('should have expected skills', async () => {
        const card = await fetchAgentCard(baseUrl);
        const skillIds = card.skills?.map((s) => s.id) || [];

        for (const expectedSkill of expectedSkills) {
          expect(skillIds).toContain(expectedSkill);
        }
      });

      it('should have HTTP transport defined', async () => {
        const card = await fetchAgentCard(baseUrl);
        expect(card.transports).toBeDefined();
        expect(Array.isArray(card.transports)).toBe(true);
        expect(card.transports!.length).toBeGreaterThan(0);

        const httpTransport = card.transports!.find((t) => t.type === 'http');
        expect(httpTransport).toBeDefined();
        expect(httpTransport!.url).toBe(baseUrl);
      });
    }
  );
});

describe('A2A Protocol Compliance - JSON-RPC 2.0', () => {
  describe.each(AGENTS)('$name JSON-RPC Compliance', ({ name: _name, baseUrl }) => {
    it('should respond to valid JSON-RPC 2.0 request', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test message' }],
        },
      });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBeDefined();
      expect(response.result || response.error).toBeDefined();
    });

    it('should reject request without jsonrpc field', async () => {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'message/send',
          id: 1,
        }),
      });

      const json = (await response.json()) as JsonRpcResponse;
      expect(json.error).toBeDefined();
      expect(json.error!.code).toBe(JSON_RPC_ERROR_CODES.INVALID_REQUEST);
    });

    it('should reject request without method field', async () => {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
        }),
      });

      const json = (await response.json()) as JsonRpcResponse;
      expect(json.error).toBeDefined();
      expect(json.error!.code).toBe(JSON_RPC_ERROR_CODES.INVALID_REQUEST);
    });

    it('should return Method Not Found for unknown method', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'unknown/method');
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(JSON_RPC_ERROR_CODES.METHOD_NOT_FOUND);
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}',
      });

      const json = (await response.json()) as JsonRpcResponse;
      expect(json.error).toBeDefined();
      expect(json.error!.code).toBe(JSON_RPC_ERROR_CODES.PARSE_ERROR);
    });

    it('should include request ID in response', async () => {
      const requestId = `test-${Date.now()}`;
      const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'test' }],
          },
        },
        id: requestId,
      };

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const json = (await response.json()) as JsonRpcResponse;
      expect(json.id).toBe(requestId);
    });
  });
});

describe('A2A Protocol Compliance - Task Management', () => {
  describe.each(AGENTS)('$name Task Lifecycle', ({ name: _name, baseUrl }) => {
    it('should create task in SUBMITTED or WORKING state', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test task' }],
        },
      });

      expect(response.result).toBeDefined();
      const task = response.result as A2ATask;
      expect(task.id).toBeDefined();
      expect(task.status).toBeDefined();
      expect([TASK_STATES.SUBMITTED, TASK_STATES.WORKING]).toContain(task.status.state);
    });

    it('should track task history', async () => {
      // Create task
      const createResponse = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test task history' }],
        },
      });

      const task = createResponse.result as A2ATask;
      expect(task.history).toBeDefined();
      expect(Array.isArray(task.history)).toBe(true);
      expect(task.history.length).toBeGreaterThan(0);

      // Each history entry should have state and timestamp
      for (const entry of task.history) {
        expect(entry.state).toBeDefined();
        expect(typeof entry.state).toBe('string');
        expect(entry.timestamp).toBeDefined();
        expect(typeof entry.timestamp).toBe('string');
      }
    });

    it('should retrieve task by ID', async () => {
      // Create task
      const createResponse = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test retrieve' }],
        },
      });

      const createdTask = createResponse.result as A2ATask;

      // Retrieve task
      const getResponse = await sendJsonRpcRequest(baseUrl, 'tasks/get', {
        taskId: createdTask.id,
      });

      expect(getResponse.result).toBeDefined();
      const retrievedTask = getResponse.result as A2ATask;
      expect(retrievedTask.id).toBe(createdTask.id);
    });

    it('should fail to retrieve non-existent task', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'tasks/get', {
        taskId: 'non-existent-task-id',
      });

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(JSON_RPC_ERROR_CODES.INVALID_PARAMS);
    });

    it('should cancel task', async () => {
      // Create task
      const createResponse = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test cancel' }],
        },
      });

      const task = createResponse.result as A2ATask;

      // Cancel task
      const cancelResponse = await sendJsonRpcRequest(baseUrl, 'tasks/cancel', {
        taskId: task.id,
      });

      expect(cancelResponse.result).toBeDefined();
      const canceledTask = cancelResponse.result as A2ATask;
      expect(canceledTask.status.state).toBe(TASK_STATES.CANCELED);
    });

    it('should have valid task state transitions', async () => {
      // Create task
      const response = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test state transitions' }],
        },
      });

      const task = response.result as A2ATask;

      // Verify current state is valid
      const validStates = Object.values(TASK_STATES);
      expect(validStates).toContain(task.status.state);

      // Verify all history states are valid
      for (const entry of task.history) {
        expect(validStates).toContain(entry.state);
      }
    });
  });
});

describe('A2A Protocol Compliance - HTTP Endpoints', () => {
  describe.each(AGENTS)('$name HTTP Endpoints', ({ name: _name, baseUrl }) => {
    it('should respond to health check endpoint', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    it('should have CORS headers', async () => {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'message/send',
          params: {
            message: {
              role: 'user',
              parts: [{ type: 'text', text: 'CORS test' }],
            },
          },
          id: 1,
        }),
      });

      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    });

    it('should handle OPTIONS preflight request', async () => {
      const response = await fetch(baseUrl, {
        method: 'OPTIONS',
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('access-control-allow-methods')).toBeTruthy();
      expect(response.headers.get('access-control-allow-headers')).toBeTruthy();
    });
  });
});

describe('A2A Protocol Compliance - Error Handling', () => {
  describe.each(AGENTS)('$name Error Codes', ({ name: _name, baseUrl }) => {
    it('should return proper error for invalid params', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'message/send', {
        // Missing required 'message' field
        invalidField: 'value',
      });

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(JSON_RPC_ERROR_CODES.INVALID_PARAMS);
    });

    it('should return proper error for empty message parts', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [], // Empty parts array
        },
      });

      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(JSON_RPC_ERROR_CODES.INVALID_PARAMS);
    });

    it('should include error message and code', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'unknown/method');

      expect(response.error).toBeDefined();
      expect(typeof response.error!.code).toBe('number');
      expect(typeof response.error!.message).toBe('string');
      expect(response.error!.message.length).toBeGreaterThan(0);
    });
  });
});

describe('A2A Protocol Compliance - Message Handling', () => {
  describe.each(AGENTS)('$name Message Processing', ({ name: _name, baseUrl }) => {
    it('should accept message with text parts', async () => {
      const response = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: 'World' },
          ],
        },
      });

      expect(response.result).toBeDefined();
      const task = response.result as A2ATask;
      expect(task.id).toBeDefined();
    });

    it('should support contextId for conversation continuity', async () => {
      const contextId = `context-${Date.now()}`;

      const response1 = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'First message' }],
        },
        contextId,
      });

      const task1 = response1.result as A2ATask;
      expect(task1.contextId).toBe(contextId);

      const response2 = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Second message' }],
        },
        contextId,
      });

      const task2 = response2.result as A2ATask;
      expect(task2.contextId).toBe(contextId);
    });

    it('should support metadata', async () => {
      const metadata = { testKey: 'testValue', timestamp: Date.now() };

      const response = await sendJsonRpcRequest(baseUrl, 'message/send', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Message with metadata' }],
        },
        metadata,
      });

      const task = response.result as A2ATask;
      expect(task.metadata).toBeDefined();
      expect(task.metadata!.testKey).toBe('testValue');
    });
  });
});
