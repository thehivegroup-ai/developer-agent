import { describe, it, expect, beforeEach } from 'vitest';
import { MessageQueue } from '../MessageQueue';
import { AgentMessage } from '@developer-agent/shared';

describe('MessageQueue', () => {
  let queue: MessageQueue;

  beforeEach(() => {
    queue = new MessageQueue();
  });

  it('should enqueue messages', (done) => {
    const message: AgentMessage = {
      id: 'msg-1',
      timestamp: new Date(),
      from: 'agent-1',
      to: 'agent-2',
      messageType: 'request',
      content: { text: 'Hello' },
      priority: 'normal',
    };

    queue.on('message:enqueued', (enqueuedMessage: AgentMessage) => {
      expect(enqueuedMessage.id).toBe('msg-1');
      done();
    });

    queue.enqueue(message);
  });

  it('should process messages by priority', (done) => {
    const messages: AgentMessage[] = [
      {
        id: 'msg-low',
        timestamp: new Date(),
        from: 'agent-1',
        to: 'agent-2',
        messageType: 'request',
        content: {},
        priority: 'low',
      },
      {
        id: 'msg-urgent',
        timestamp: new Date(),
        from: 'agent-1',
        to: 'agent-2',
        messageType: 'request',
        content: {},
        priority: 'urgent',
      },
      {
        id: 'msg-normal',
        timestamp: new Date(),
        from: 'agent-1',
        to: 'agent-2',
        messageType: 'request',
        content: {},
        priority: 'normal',
      },
    ];

    const processedMessages: string[] = [];

    queue.on('message:ready', (message: AgentMessage) => {
      processedMessages.push(message.id);
      
      if (processedMessages.length === 3) {
        // Urgent should be processed first, then normal, then low
        expect(processedMessages[0]).toBe('msg-urgent');
        expect(processedMessages[1]).toBe('msg-normal');
        expect(processedMessages[2]).toBe('msg-low');
        done();
      }
    });

    // Enqueue in non-priority order
    messages.forEach((msg) => queue.enqueue(msg));
  });

  it('should get queue statistics', () => {
    const message: AgentMessage = {
      id: 'msg-1',
      timestamp: new Date(),
      from: 'agent-1',
      to: 'agent-2',
      messageType: 'request',
      content: {},
      priority: 'normal',
    };

    // Let the message be processed first
    queue.on('message:ready', () => {
      const stats = queue.getStats();
      expect(stats).toHaveProperty('urgent');
      expect(stats).toHaveProperty('high');
      expect(stats).toHaveProperty('normal');
      expect(stats).toHaveProperty('low');
    });

    queue.enqueue(message);
  });

  it('should skip expired messages', (done) => {
    const expiredMessage: AgentMessage = {
      id: 'msg-expired',
      timestamp: new Date(),
      from: 'agent-1',
      to: 'agent-2',
      messageType: 'request',
      content: {},
      priority: 'normal',
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    };

    queue.on('message:expired', (message: AgentMessage) => {
      expect(message.id).toBe('msg-expired');
      done();
    });

    queue.enqueue(expiredMessage);
  });

  it('should clear all queues', () => {
    const message: AgentMessage = {
      id: 'msg-1',
      timestamp: new Date(),
      from: 'agent-1',
      to: 'agent-2',
      messageType: 'request',
      content: {},
      priority: 'normal',
    };

    queue.enqueue(message);
    queue.clear();

    const stats = queue.getStats();
    expect(stats.normal).toBe(0);
    expect(stats.urgent).toBe(0);
    expect(stats.high).toBe(0);
    expect(stats.low).toBe(0);
  });
});
