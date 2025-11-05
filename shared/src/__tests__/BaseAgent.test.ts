import { describe, it, expect, beforeEach } from 'vitest';
import { BaseAgent, BaseAgentConfig } from '../BaseAgent';
import { AgentMessage } from '@developer-agent/shared';

// Test implementation of BaseAgent
class TestAgent extends BaseAgent {
  private initCalled = false;
  private shutdownCalled = false;

  async init(): Promise<void> {
    this.initCalled = true;
  }

  async handleRequest(request: unknown): Promise<unknown> {
    return { success: true, data: request };
  }

  async shutdown(): Promise<void> {
    this.shutdownCalled = true;
    this.setStatus('destroyed');
  }

  getInitCalled(): boolean {
    return this.initCalled;
  }

  getShutdownCalled(): boolean {
    return this.shutdownCalled;
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let config: BaseAgentConfig;

  beforeEach(() => {
    config = {
      agentType: 'developer',
      ttlMinutes: 60,
    };
    agent = new TestAgent(config);
  });

  describe('initialization', () => {
    it('should create agent with unique ID', () => {
      const agent2 = new TestAgent(config);
      expect(agent.getMetadata().agentId).toBeDefined();
      expect(agent.getMetadata().agentId).not.toBe(agent2.getMetadata().agentId);
    });

    it('should set agent type correctly', () => {
      expect(agent.getMetadata().agentType).toBe('developer');
    });

    it('should initialize with idle status', () => {
      expect(agent.getMetadata().status).toBe('idle');
    });

    it('should call init method', async () => {
      await agent.init();
      expect(agent.getInitCalled()).toBe(true);
    });
  });

  describe('metadata', () => {
    it('should return complete metadata', () => {
      const metadata = agent.getMetadata();
      expect(metadata).toHaveProperty('agentId');
      expect(metadata).toHaveProperty('agentType');
      expect(metadata).toHaveProperty('status');
      expect(metadata).toHaveProperty('spawnedAt');
      expect(metadata).toHaveProperty('lastActivityAt');
      expect(metadata).toHaveProperty('ttlExpiresAt');
    });

    it('should include repository information when provided', () => {
      const agentWithRepo = new TestAgent({
        agentType: 'repository',
        repositoryType: 'react',
        repositoryName: 'test-repo',
      });
      const metadata = agentWithRepo.getMetadata();
      expect(metadata.repositoryType).toBe('react');
      expect(metadata.repositoryName).toBe('test-repo');
    });
  });

  describe('TTL management', () => {
    it('should not be expired initially', () => {
      expect(agent.isExpired()).toBe(false);
    });

    it('should detect expiration', () => {
      const expiredAgent = new TestAgent({
        agentType: 'developer',
        ttlMinutes: -1, // Expired
      });
      expect(expiredAgent.isExpired()).toBe(true);
    });

    it('should extend TTL', () => {
      const originalExpiry = agent.getMetadata().ttlExpiresAt;
      agent.extendTTL(30);
      const newExpiry = agent.getMetadata().ttlExpiresAt;
      expect(newExpiry.getTime()).toBeGreaterThan(originalExpiry.getTime());
    });
  });

  describe('message handling', () => {
    it('should handle messages with registered handlers', async () => {
      // Register a test handler
      agent['registerMessageHandler']('test', async (message: AgentMessage) => {
        return agent['createResponse'](message, { result: 'success' });
      });

      const testMessage: AgentMessage = {
        id: 'test-123',
        timestamp: new Date(),
        from: 'sender-agent',
        to: agent.getMetadata().agentId,
        messageType: 'request',
        content: {
          action: 'test',
        },
        priority: 'normal',
      };

      const response = await agent.handleMessage(testMessage);
      expect(response.messageType).toBe('response');
      expect(response.content.data).toEqual({ result: 'success' });
    });

    it('should return error for unknown action', async () => {
      const testMessage: AgentMessage = {
        id: 'test-123',
        timestamp: new Date(),
        from: 'sender-agent',
        to: agent.getMetadata().agentId,
        messageType: 'request',
        content: {
          action: 'unknown-action',
        },
        priority: 'normal',
      };

      const response = await agent.handleMessage(testMessage);
      expect(response.messageType).toBe('error');
      expect(response.content.error?.code).toBe('UNKNOWN_ACTION');
    });

    it('should return error when no action provided', async () => {
      const testMessage: AgentMessage = {
        id: 'test-123',
        timestamp: new Date(),
        from: 'sender-agent',
        to: agent.getMetadata().agentId,
        messageType: 'request',
        content: {},
        priority: 'normal',
      };

      const response = await agent.handleMessage(testMessage);
      expect(response.messageType).toBe('error');
      expect(response.content.error?.code).toBe('NO_ACTION');
    });
  });

  describe('shutdown', () => {
    it('should call shutdown method', async () => {
      await agent.shutdown();
      expect(agent.getShutdownCalled()).toBe(true);
    });

    it('should set status to destroyed after shutdown', async () => {
      await agent.shutdown();
      expect(agent.getMetadata().status).toBe('destroyed');
    });
  });
});
