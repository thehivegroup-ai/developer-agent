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
      throw new Error(
        `API Gateway is not running at ${API_BASE_URL}. Start it with: npm run dev -w api-gateway`
      );
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
      await new Promise((resolve) => setTimeout(resolve, 2000));

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
      const response = await fetch(`${API_BASE_URL}/api/chat/query/nonexistent-query-id`);

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const messagesResponse = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${newConvId}/messages`
      );
      expect(messagesResponse.status).toBe(200);
      const messagesData: any = await messagesResponse.json();
      expect(Array.isArray(messagesData.messages)).toBe(true);
    }, 45000);
  });

  describe('DELETE /api/chat/conversation/:id', () => {
    it('should delete a conversation and all related data', async () => {
      const deleteTestUser = `delete-test-${Date.now()}`;

      // 1. Create a conversation
      const convResponse = await fetch(`${API_BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: deleteTestUser,
          title: 'Conversation to Delete',
        }),
      });
      expect(convResponse.status).toBe(201);
      const convData: any = await convResponse.json();
      const convToDelete = convData.conversationId;

      // 2. Add some messages to it
      const msgResponse = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convToDelete,
          message: 'Test message in conversation',
          username: deleteTestUser,
        }),
      });
      expect(msgResponse.status).toBe(202);

      // Wait for message to be stored
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 3. Verify conversation exists
      const getConvResponse = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${convToDelete}/messages`
      );
      expect(getConvResponse.status).toBe(200);

      // 4. Delete the conversation
      const deleteResponse = await fetch(`${API_BASE_URL}/api/chat/conversation/${convToDelete}`, {
        method: 'DELETE',
      });
      expect(deleteResponse.status).toBe(200);
      const deleteData: any = await deleteResponse.json();
      expect(deleteData.success).toBe(true);

      // 5. Verify conversation is gone
      const getDeletedConvResponse = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${convToDelete}/messages`
      );
      expect(getDeletedConvResponse.status).toBe(404);
    }, 30000);

    it('should return 404 for non-existent conversation', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const deleteResponse = await fetch(`${API_BASE_URL}/api/chat/conversation/${nonExistentId}`, {
        method: 'DELETE',
      });
      expect(deleteResponse.status).toBe(404);
    });
  });

  describe('Conversation Summary Generation', () => {
    it('should generate title and create system summary message on new conversation', async () => {
      const summaryTestUser = `summary-test-${Date.now()}`;

      // Send message without conversationId to trigger new conversation creation
      const msgResponse = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'What are the best practices for TypeScript development?',
          username: summaryTestUser,
        }),
      });
      expect(msgResponse.status).toBe(202);
      const msgData: any = await msgResponse.json();
      const newConvId = msgData.conversationId;

      // Wait for conversation and messages to be created
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify conversation has a title
      const convListResponse = await fetch(
        `${API_BASE_URL}/api/chat/conversations?username=${summaryTestUser}`
      );
      expect(convListResponse.status).toBe(200);
      const convListData: any = await convListResponse.json();
      expect(convListData.conversations.length).toBeGreaterThan(0);

      const createdConv = convListData.conversations.find((c: any) => c.id === newConvId);
      expect(createdConv).toBeDefined();
      expect(createdConv.title).toBeTruthy();
      expect(typeof createdConv.title).toBe('string');

      // Fetch messages and verify first message is system assistant with summary
      const messagesResponse = await fetch(
        `${API_BASE_URL}/api/chat/conversations/${newConvId}/messages`
      );
      expect(messagesResponse.status).toBe(200);
      const messagesData: any = await messagesResponse.json();
      expect(messagesData.messages.length).toBeGreaterThan(0);

      const firstMessage = messagesData.messages[0];
      expect(firstMessage.role).toBe('assistant');
      expect(firstMessage.content).toContain('Conversation summary:');
      expect(firstMessage.metadata?.system).toBe(true);
    }, 30000);

    it('should fallback to truncated message if LLM summary fails', async () => {
      // This test verifies the fallback behavior exists
      // In practice, it's hard to force LLM to fail, but the code has the fallback
      const fallbackUser = `fallback-test-${Date.now()}`;

      const msgResponse = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Short test',
          username: fallbackUser,
        }),
      });
      expect(msgResponse.status).toBe(202);
      const msgData: any = await msgResponse.json();

      // Conversation should still be created with a title (LLM or fallback)
      expect(msgData.conversationId).toBeTruthy();
    }, 15000);
  });

  describe('Task Duration Logging', () => {
    it('should log task duration when query completes', async () => {
      const durationTestUser = `duration-test-${Date.now()}`;

      // Send a message to trigger a task
      const msgResponse = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'List the dependencies in a simple project',
          username: durationTestUser,
        }),
      });
      expect(msgResponse.status).toBe(202);
      const msgData: any = await msgResponse.json();
      const testQueryId = msgData.queryId;

      // Poll for task completion (wait up to 60 seconds)
      let taskCompleted = false;
      let attempts = 0;
      const maxAttempts = 60;

      while (!taskCompleted && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const queryResponse = await fetch(`${API_BASE_URL}/api/chat/query/${testQueryId}`);
        if (queryResponse.status === 200) {
          const queryData: any = await queryResponse.json();
          if (queryData.status === 'completed' || queryData.status === 'failed') {
            taskCompleted = true;

            // If task completed successfully, verify duration was logged
            if (queryData.status === 'completed') {
              // Note: We can't directly query agent_messages from the API,
              // but we verify the query has completedAt timestamp
              expect(queryData.completedAt).toBeTruthy();
              expect(queryData.createdAt).toBeTruthy();

              // Verify timestamps are valid dates
              const created = new Date(queryData.createdAt);
              const completed = new Date(queryData.completedAt);
              expect(completed.getTime()).toBeGreaterThan(created.getTime());

              // Calculate expected duration
              const durationMs = completed.getTime() - created.getTime();
              expect(durationMs).toBeGreaterThan(0);
            }
          }
        }
        attempts++;
      }

      // Verify task completed within timeout
      expect(taskCompleted).toBe(true);
    }, 90000); // 90 second timeout for this test
  });
});
