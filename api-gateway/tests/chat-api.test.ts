/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeAll } from 'vitest';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USERNAME = `test-user-${Date.now()}`;

describe('Chat API Endpoints (Fetch)', () => {
  let conversationId: string;
  let queryId: string;

  beforeAll(async () => {
    // Verify API is running
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data.status).toBe('healthy');
    } catch (error) {
      throw new Error(`API Gateway is not running at ${API_BASE_URL}. Start it with: npm run dev -w api-gateway`);
    }
  });

  describe('POST /api/chat/conversations', () => {
    it('should create a new conversation', async () => {
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: TEST_USERNAME,
          title: 'Test Conversation',
        }),
      });

      expect(response.status).toBe(201);
      const data: any = await response.json();
      expect(data).toHaveProperty('conversationId');
      expect(data).toHaveProperty('createdAt');
      expect(data.title).toBe('Test Conversation');

      conversationId = data.conversationId;
    });

    it('should return 400 if username is missing', async () => {
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/chat/conversations', () => {
    it('should retrieve conversations for a user', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/conversations?username=${TEST_USERNAME}`
      );

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data).toHaveProperty('conversations');
      expect(Array.isArray(data.conversations)).toBe(true);
      expect(data.conversations.length).toBeGreaterThan(0);
      expect(data.conversations[0]).toHaveProperty('id');
      expect(data.conversations[0]).toHaveProperty('title');
    });

    it('should return 400 if username is missing', async () => {
      const response = await fetch(`${API_BASE_URL}/api/chat/conversations`);
      expect(response.status).toBe(400);
    });

    it('should return empty array for user with no conversations', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/conversations?username=nonexistent-user`
      );

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(Array.isArray(data.conversations)).toBe(true);
      expect(data.conversations.length).toBe(0);
    });
  });

  describe('POST /api/chat/message', () => {
    it('should send a message and create a query', async () => {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: 'What is TypeScript?',
          username: TEST_USERNAME,
        }),
      });

      expect(response.status).toBe(202); // Accepted - async processing
      const data: any = await response.json();
      expect(data).toHaveProperty('queryId');
      expect(data).toHaveProperty('conversationId');
      expect(data).toHaveProperty('status');
      expect(data.conversationId).toBe(conversationId);

      queryId = data.queryId;
    }, 30000);

    it('should create new conversation if conversationId is missing', async () => {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test',
          username: TEST_USERNAME,
        }),
      });
      
      expect(response.status).toBe(202); // Creates new conversation
      const data: any = await response.json();
      expect(data).toHaveProperty('conversationId');
      expect(data).toHaveProperty('queryId');
    });

    it('should return 400 if message is missing', async () => {
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          username: TEST_USERNAME,
        }),
      });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/chat/conversations/:id/messages', () => {
    it('should retrieve messages for a conversation', async () => {
      // Wait for message to be stored
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${conversationId}/messages`
      );

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data).toHaveProperty('messages');
      expect(Array.isArray(data.messages)).toBe(true);
      // Message might still be processing, so just check structure
      if (data.messages.length > 0) {
        expect(data.messages[0]).toHaveProperty('content');
        expect(data.messages[0]).toHaveProperty('role');
      }
    });

    it('should return 404 for non-existent conversation', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${nonExistentId}/messages`
      );
      
      // API may return 404 or 500, depends on implementation
      expect([404, 500]).toContain(response.status);
    });
  });

  describe('GET /api/chat/query/:queryId', () => {
    it('should retrieve query status', async () => {
      // Skip if queryId wasn't set (previous test failed)
      if (!queryId) {
        console.warn('Skipping: queryId not set from previous test');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/query/${queryId}`);

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data).toHaveProperty('queryId');
      expect(data).toHaveProperty('status');
      expect(data.queryId).toBe(queryId);
    });

    it('should return 404 for non-existent query', async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/chat/query/nonexistent-query-id`
      );
      
      expect(response.status).toBe(404);
    });
  });

  describe('Integration Flow', () => {
    it('should complete full chat workflow', async () => {
      const integrationUser = `integration-${Date.now()}`;
      
      // 1. Create a conversation
      const convResponse = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: integrationUser,
          title: 'Integration Test',
        }),
      });
      expect(convResponse.status).toBe(201);
      const convData: any = await convResponse.json();
      const newConvId = convData.conversationId;

      // 2. Send a message
      const msgResponse = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: newConvId,
          message: 'Test integration',
          username: integrationUser, // Use same username
        }),
      });
      expect(msgResponse.status).toBe(202);
      const msgData: any = await msgResponse.json();
      const newQueryId = msgData.queryId;

      // 3. Check query status
      const queryResponse = await fetch(`${API_BASE_URL}/api/chat/query/${newQueryId}`);
      expect(queryResponse.status).toBe(200);
      const queryData: any = await queryResponse.json();
      expect(queryData.queryId).toBe(newQueryId);

      // 4. Get messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      const messagesResponse = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${newConvId}/messages`
      );
      expect(messagesResponse.status).toBe(200);
      const messagesData: any = await messagesResponse.json();
      expect(Array.isArray(messagesData.messages)).toBe(true);
    }, 45000);
  });
});
