/**
 * A2A HTTP Client Tests
 *
 * Comprehensive test suite for A2AHttpClient.
 * Tests HTTP communication, agent discovery, retry logic, and error handling.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { A2AHttpClient } from '../src/a2a/client/A2AHttpClient';
import {
  MessageRole,
  type MessageSendResult,
  type TasksGetResult,
  type AgentCard,
} from '../src/a2a/types';

// Test configuration
const GITHUB_AGENT_URL = 'http://localhost:3002';
const REPO_AGENT_URL = 'http://localhost:3003';
const NONEXISTENT_URL = 'http://localhost:9999';

let githubAgentProcess: ChildProcess;
let repoAgentProcess: ChildProcess;
let client: A2AHttpClient;

/**
 * Start an agent server for testing
 */
async function startServer(
  directory: string,
  serverFile: string,
  healthUrl: string,
  name: string
): Promise<ChildProcess> {
  console.log(`Starting ${name}...`);

  const isWindows = process.platform === 'win32';
  const serverProcess = spawn(isWindows ? 'npx.cmd' : 'npx', ['tsx', serverFile], {
    cwd: directory,
    stdio: 'pipe',
    shell: isWindows,
  });

  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${name} startup timeout`)), 30000);

    const checkServer = async () => {
      try {
        const response = await fetch(healthUrl);
        if (response.ok) {
          clearTimeout(timeout);
          console.log(`${name} is ready`);
          resolve();
        } else {
          setTimeout(() => void checkServer(), 100);
        }
      } catch {
        setTimeout(() => void checkServer(), 100);
      }
    };

    void checkServer();
  });

  return serverProcess;
}

// Start test servers
beforeAll(async () => {
  console.log('Starting test servers...');

  // Start GitHub Agent on port 3002
  githubAgentProcess = await startServer(
    '../github-agent',
    'src/a2a-server.ts',
    `${GITHUB_AGENT_URL}/health`,
    'GitHub Agent A2A Server'
  );

  // Start Repository Agent on port 3003
  repoAgentProcess = await startServer(
    '../repository-agents',
    'src/a2a-server.ts',
    `${REPO_AGENT_URL}/health`,
    'Repository Agent A2A Server'
  );

  console.log('All test servers started');
}, 60000);

// Stop test servers
afterAll(async () => {
  console.log('Stopping test servers...');

  if (githubAgentProcess) {
    githubAgentProcess.kill('SIGTERM');
  }

  if (repoAgentProcess) {
    repoAgentProcess.kill('SIGTERM');
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log('Test servers stopped');
});

// Create fresh client before each test
beforeEach(() => {
  client = new A2AHttpClient({
    timeout: 5000,
    maxRetries: 2,
    retryDelay: 100,
    debug: false,
  });
});

describe('A2AHttpClient - Agent Discovery', () => {
  it('should fetch Agent Card from GitHub Agent', async () => {
    const agentCard = await client.getAgentCard(GITHUB_AGENT_URL);

    expect(agentCard).toHaveProperty('version', '0.3.0');
    expect(agentCard).toHaveProperty('id');
    expect(agentCard).toHaveProperty('name');
    expect(agentCard).toHaveProperty('skills');
    expect(agentCard).toHaveProperty('transports');
    expect(Array.isArray(agentCard.skills)).toBe(true);
    expect(Array.isArray(agentCard.transports)).toBe(true);
  });

  it('should fetch Agent Card from Repository Agent', async () => {
    const agentCard = await client.getAgentCard(REPO_AGENT_URL);

    expect(agentCard).toHaveProperty('version', '0.3.0');
    expect(agentCard.id).toBe('repository-agent');
    expect(agentCard.name).toBe('Repository Agent');
  });

  it('should cache Agent Cards', async () => {
    // First fetch
    const card1 = await client.getAgentCard(GITHUB_AGENT_URL);
    const startTime = Date.now();

    // Second fetch (should be from cache, much faster)
    const card2 = await client.getAgentCard(GITHUB_AGENT_URL);
    const duration = Date.now() - startTime;

    expect(card2).toEqual(card1);
    expect(duration).toBeLessThan(10); // Should be near-instant from cache
  });

  it('should force fetch when requested', async () => {
    // Fetch and cache
    await client.getAgentCard(GITHUB_AGENT_URL);

    // Force fetch (skip cache)
    const card = await client.getAgentCard(GITHUB_AGENT_URL, true);

    expect(card).toHaveProperty('version', '0.3.0');
  });

  it('should throw error for invalid Agent Card URL', async () => {
    await expect(client.getAgentCard(NONEXISTENT_URL)).rejects.toThrow();
  });
});

describe('A2AHttpClient - Health Checks', () => {
  it('should return true for healthy GitHub Agent', async () => {
    const isHealthy = await client.healthCheck(GITHUB_AGENT_URL);
    expect(isHealthy).toBe(true);
  });

  it('should return true for healthy Repository Agent', async () => {
    const isHealthy = await client.healthCheck(REPO_AGENT_URL);
    expect(isHealthy).toBe(true);
  });

  it('should return false for non-existent agent', async () => {
    const isHealthy = await client.healthCheck(NONEXISTENT_URL);
    expect(isHealthy).toBe(false);
  });
});

describe('A2AHttpClient - Message Sending', () => {
  it('should send message to GitHub Agent', async () => {
    const result: MessageSendResult = await client.sendMessage(GITHUB_AGENT_URL, {
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'search repositories: typescript agent',
          },
        ],
      },
    });

    expect(result).toHaveProperty('task');
    expect(result).toHaveProperty('messageId');
    expect(result.task).toHaveProperty('id');
    expect(result.task).toHaveProperty('status');
    expect(result.task.status).toHaveProperty('state');
    expect(['submitted', 'working']).toContain(result.task.status.state);
  });

  it('should send message to Repository Agent', async () => {
    const result: MessageSendResult = await client.sendMessage(REPO_AGENT_URL, {
      message: {
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'analyze: file.ts',
          },
        ],
      },
    });

    expect(result.task).toHaveProperty('id');
    expect(result.messageId).toBeDefined();
  });

  it('should handle message with context ID', async () => {
    const result = await client.sendMessage(GITHUB_AGENT_URL, {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'test message' }],
        contextId: 'test-context-123',
      },
    });

    expect(result.task).toHaveProperty('contextId', 'test-context-123');
  });

  it('should handle message with metadata', async () => {
    const result = await client.sendMessage(GITHUB_AGENT_URL, {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'test message' }],
        metadata: { source: 'test', priority: 'high' },
      },
    });

    expect(result.task).toBeDefined();
  });

  it('should throw error for invalid message', async () => {
    await expect(
      client.sendMessage(GITHUB_AGENT_URL, {
        message: {
          role: 'user',
          parts: [], // Empty parts - invalid
        },
      })
    ).rejects.toThrow();
  });
});

describe('A2AHttpClient - Task Management', () => {
  it('should get task by ID', async () => {
    // Create a task first
    const createResult = await client.sendMessage(GITHUB_AGENT_URL, {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'test task' }],
      },
    });

    const taskId = createResult.task.id;

    // Get the task
    const getResult: TasksGetResult = await client.getTask(GITHUB_AGENT_URL, { taskId });

    expect(getResult.task).toHaveProperty('id', taskId);
    expect(getResult.task).toHaveProperty('status');
  });

  it('should throw error for non-existent task', async () => {
    await expect(
      client.getTask(GITHUB_AGENT_URL, { taskId: 'non-existent-task-id' })
    ).rejects.toThrow(/RPC Error/);
  });

  it('should cancel task', async () => {
    // Create a task
    const createResult = await client.sendMessage(GITHUB_AGENT_URL, {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'task to cancel' }],
      },
    });

    const taskId = createResult.task.id;

    // Attempt to cancel - might fail if task completes too quickly
    try {
      const cancelResult = await client.cancelTask(GITHUB_AGENT_URL, {
        taskId,
        reason: 'Test cancellation',
      });

      expect(cancelResult.task).toHaveProperty('id', taskId);
      expect(cancelResult.task.status.state).toBe('canceled');
    } catch (error) {
      // Expected: A2A agents complete tasks quickly, cancellation might fail
      expect(error).toHaveProperty('message');
      expect((error as Error).message).toContain('Cannot cancel task');
    }
  });

  it('should continue existing task with taskId', async () => {
    // Create initial task
    const createResult = await client.sendMessage(GITHUB_AGENT_URL, {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'initial message' }],
      },
    });

    const taskId = createResult.task.id;

    // Attempt to continue - might fail if task completes too quickly
    try {
      const continueResult = await client.sendMessage(GITHUB_AGENT_URL, {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'follow-up message' }],
        },
        taskId,
      });

      expect(continueResult.task.id).toBe(taskId);
    } catch (error) {
      // Expected: A2A agents complete tasks quickly, continuation might fail
      expect(error).toHaveProperty('message');
      expect((error as Error).message).toContain('terminal state');
    }
  });
});

describe('A2AHttpClient - Error Handling', () => {
  it('should throw error for non-existent agent', async () => {
    await expect(
      client.sendMessage(NONEXISTENT_URL, {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test' }],
        },
      })
    ).rejects.toThrow();
  });

  it('should retry on network errors', async () => {
    const slowClient = new A2AHttpClient({
      timeout: 1, // Extremely short timeout to force failure
      maxRetries: 2,
      retryDelay: 50,
      debug: false,
    });

    await expect(
      slowClient.sendMessage(GITHUB_AGENT_URL, {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'test' }],
        },
      })
    ).rejects.toThrow();
  });

  it('should handle malformed responses', async () => {
    // Try to call invalid endpoint
    await expect(
      client.getTask('http://localhost:3002/invalid', { taskId: 'test' })
    ).rejects.toThrow();
  });
});

describe('A2AHttpClient - Multi-Agent Communication', () => {
  it('should communicate with multiple agents', async () => {
    // Send message to GitHub Agent
    const githubResult = await client.sendMessage(GITHUB_AGENT_URL, {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'search repositories: test' }],
      },
    });

    // Send message to Repository Agent
    const repoResult = await client.sendMessage(REPO_AGENT_URL, {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'analyze: file.ts' }],
      },
    });

    expect(githubResult.task.id).toBeDefined();
    expect(repoResult.task.id).toBeDefined();
    expect(githubResult.task.id).not.toBe(repoResult.task.id);
  });

  it('should get Agent Cards from multiple agents', async () => {
    const [githubCard, repoCard]: [AgentCard, AgentCard] = await Promise.all([
      client.getAgentCard(GITHUB_AGENT_URL),
      client.getAgentCard(REPO_AGENT_URL),
    ]);

    expect(githubCard.id).toBe('github-agent');
    expect(repoCard.id).toBe('repository-agent');
  });
});

describe('A2AHttpClient - Cache Management', () => {
  it('should clear cache', async () => {
    // Fetch and cache
    await client.getAgentCard(GITHUB_AGENT_URL);

    // Clear cache
    client.clearCache();

    // Next fetch should be fresh (not from cache)
    const card = await client.getAgentCard(GITHUB_AGENT_URL);
    expect(card).toHaveProperty('version', '0.3.0');
  });
});

describe('A2AHttpClient - Resource Cleanup', () => {
  it('should destroy client and close connections', () => {
    const tempClient = new A2AHttpClient();
    expect(() => tempClient.destroy()).not.toThrow();
  });
});
