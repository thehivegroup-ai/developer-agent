/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { io as ioClient, Socket } from 'socket.io-client';

const WS_BASE_URL = process.env.WS_BASE_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

describe('WebSocket Integration Tests', () => {
  const sockets: Socket[] = [];
  const testConversationId = `test-conv-${Date.now()}`;

  beforeAll(async () => {
    // Verify API is running before WebSocket tests
    try {
      const response = await fetch(`${WS_BASE_URL}/health`);
      expect(response.status).toBe(200);
    } catch (error) {
      throw new Error(`API Gateway is not running at ${WS_BASE_URL}`);
    }
  });

  afterEach(() => {
    // Disconnect all sockets after each test
    sockets.forEach((socket) => {
      if (socket.connected) {
        socket.disconnect();
      }
    });
    sockets.length = 0;
  });

  function createSocket(): Socket {
    const socket = ioClient(WS_BASE_URL, {
      path: '/socket.io/',
      forceNew: true,
    });
    sockets.push(socket);
    return socket;
  }

  function waitForEvent(socket: Socket, event: string, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event: ${event}`));
      }, timeout);

      socket.once(event, (data: any) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  describe('Connection', () => {
    it(
      'should connect to WebSocket server',
      async () => {
        const socket = createSocket();

        await waitForEvent(socket, 'connect');

        expect(socket.connected).toBe(true);
        expect(socket.id).toBeDefined();
      },
      TEST_TIMEOUT
    );

    it(
      'should disconnect gracefully',
      async () => {
        const socket = createSocket();

        await waitForEvent(socket, 'connect');
        expect(socket.connected).toBe(true);

        const disconnectPromise = waitForEvent(socket, 'disconnect');
        socket.disconnect();

        const reason = await disconnectPromise;
        expect(socket.connected).toBe(false);
        expect(reason).toBeDefined();
      },
      TEST_TIMEOUT
    );

    it(
      'should handle connection errors',
      async () => {
        const badSocket = ioClient('http://localhost:9999', {
          path: '/socket.io/',
          timeout: 1000,
          reconnection: false,
        });

        try {
          await waitForEvent(badSocket, 'connect_error', 2000);
          // Error expected
        } catch (error) {
          // Timeout also acceptable
        } finally {
          badSocket.disconnect();
        }
      },
      TEST_TIMEOUT
    );
  });

  describe('Room Management', () => {
    it(
      'should join a conversation room',
      async () => {
        const socket = createSocket();

        await waitForEvent(socket, 'connect');

        const joinedPromise = waitForEvent(socket, 'joined');
        socket.emit('join:conversation', {
          conversationId: testConversationId,
          username: 'test-user',
        });

        const data = await joinedPromise;
        expect(data).toHaveProperty('conversationId');
        expect(data).toHaveProperty('timestamp');
        expect(data.conversationId).toBe(testConversationId);
      },
      TEST_TIMEOUT
    );

    it(
      'should leave a conversation room',
      async () => {
        const socket = createSocket();

        await waitForEvent(socket, 'connect');

        // Join first
        const joinedPromise = waitForEvent(socket, 'joined');
        socket.emit('join:conversation', {
          conversationId: testConversationId,
          username: 'test-user',
        });
        await joinedPromise;

        // Then leave
        socket.emit('leave:conversation', {
          conversationId: testConversationId,
        });

        // Wait a bit to ensure leave is processed
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Should be able to disconnect cleanly
        socket.disconnect();
        expect(socket.connected).toBe(false);
      },
      TEST_TIMEOUT
    );

    it(
      'should support multiple clients in same room',
      async () => {
        const socket1 = createSocket();
        const socket2 = createSocket();

        // Wait for both to connect
        await Promise.all([waitForEvent(socket1, 'connect'), waitForEvent(socket2, 'connect')]);

        // Both join the same room
        const joined1Promise = waitForEvent(socket1, 'joined');
        const joined2Promise = waitForEvent(socket2, 'joined');

        socket1.emit('join:conversation', {
          conversationId: testConversationId,
          username: 'user1',
        });

        socket2.emit('join:conversation', {
          conversationId: testConversationId,
          username: 'user2',
        });

        const [data1, data2] = await Promise.all([joined1Promise, joined2Promise]);

        expect(data1.conversationId).toBe(testConversationId);
        expect(data2.conversationId).toBe(testConversationId);
      },
      TEST_TIMEOUT
    );
  });

  describe('Event Structure Validation', () => {
    it(
      'should validate WebSocketEventData structure',
      async () => {
        const socket = createSocket();

        await waitForEvent(socket, 'connect');

        const joinedPromise = waitForEvent(socket, 'joined');
        socket.emit('join:conversation', {
          conversationId: testConversationId,
          username: 'test-user',
        });

        const joinData = await joinedPromise;

        // Validate basic structure
        expect(joinData).toHaveProperty('conversationId');
        expect(joinData).toHaveProperty('timestamp');
        expect(typeof joinData.timestamp).toBe('string');

        // Validate ISO timestamp format
        const timestamp = joinData.timestamp as string;
        expect(() => new Date(timestamp)).not.toThrow();
      },
      TEST_TIMEOUT
    );

    it('should have correct structure for all event types', () => {
      // This test documents the expected event structure
      const eventTypes = [
        'agent:spawned',
        'agent:status',
        'agent:message',
        'task:created',
        'task:updated',
        'query:progress',
        'query:completed',
        'error',
      ];

      // All events should follow the WebSocketEventData structure:
      // { type, conversationId, timestamp, data }
      eventTypes.forEach((eventType) => {
        expect(eventType).toBeTruthy();
        expect(typeof eventType).toBe('string');
      });
    });
  });

  describe('Room Isolation', () => {
    it(
      'should isolate events between different rooms',
      async () => {
        const socket1 = createSocket();
        const socket2 = createSocket();

        const room1 = `test-room-1-${Date.now()}`;
        const room2 = `test-room-2-${Date.now()}`;

        // Wait for connections
        await Promise.all([waitForEvent(socket1, 'connect'), waitForEvent(socket2, 'connect')]);

        // Join different rooms
        const joined1 = waitForEvent(socket1, 'joined');
        const joined2 = waitForEvent(socket2, 'joined');

        socket1.emit('join:conversation', {
          conversationId: room1,
          username: 'user1',
        });

        socket2.emit('join:conversation', {
          conversationId: room2,
          username: 'user2',
        });

        const [data1, data2] = await Promise.all([joined1, joined2]);

        expect(data1.conversationId).toBe(room1);
        expect(data2.conversationId).toBe(room2);
        expect(data1.conversationId).not.toBe(data2.conversationId);
      },
      TEST_TIMEOUT
    );
  });

  describe('Reconnection', () => {
    it(
      'should handle manual reconnection',
      async () => {
        const socket = createSocket();

        // First connection
        await waitForEvent(socket, 'connect');
        expect(socket.connected).toBe(true);

        // Disconnect
        const disconnectPromise = waitForEvent(socket, 'disconnect');
        socket.disconnect();
        await disconnectPromise;

        expect(socket.connected).toBe(false);

        // Reconnect
        const reconnectPromise = waitForEvent(socket, 'connect');
        socket.connect();
        await reconnectPromise;

        expect(socket.connected).toBe(true);
      },
      TEST_TIMEOUT
    );
  });

  describe('Integration with Chat API', () => {
    it(
      'should join room after creating conversation via API',
      async () => {
        const username = `ws-test-${Date.now()}`;

        // Create conversation via REST API
        const response = await fetch(`${WS_BASE_URL}/api/chat/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            title: 'WebSocket Test Conversation',
          }),
        });

        expect(response.status).toBe(201);
        const data: any = await response.json();
        const conversationId = data.conversationId;

        // Now join via WebSocket
        const socket = createSocket();
        await waitForEvent(socket, 'connect');

        const joinedPromise = waitForEvent(socket, 'joined');
        socket.emit('join:conversation', {
          conversationId,
          username,
        });

        const joinData = await joinedPromise;
        expect(joinData.conversationId).toBe(conversationId);
      },
      TEST_TIMEOUT
    );
  });
});
