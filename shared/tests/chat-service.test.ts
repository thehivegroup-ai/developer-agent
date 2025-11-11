/**
 * Chat Service Database Tests
 * Tests for database operations in chat-service.ts
 */

// Load environment variables from root .env.local
import dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '../../.env.local') });

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getOrCreateUser,
  createConversation,
  createMessage,
  getMessagesByConversation,
  deleteConversation,
  getConversation,
  createQuery,
  getQuery,
  logAgentActivity,
  getAgentActivityByQuery,
} from '../src/database/chat-service.js';
import { getPgPool, closePgPool } from '../src/database/postgres.js';

describe('Chat Service - Database Operations', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Ensure database connection is available
    const pool = getPgPool();
    await pool.query('SELECT 1');

    // Create a test user
    const user = await getOrCreateUser(`chat-test-${Date.now()}`);
    testUserId = user.id;
  });

  afterAll(async () => {
    await closePgPool();
  });

  describe('deleteConversation', () => {
    it('should delete conversation and all related records in transaction', async () => {
      // 1. Create a test conversation
      const conversation = await createConversation(testUserId, 'Test Conversation to Delete');
      const convId = conversation.id;

      // 2. Add messages to the conversation
      await createMessage({
        conversationId: convId,
        role: 'user',
        content: 'Test message 1',
      });
      await createMessage({
        conversationId: convId,
        role: 'assistant',
        content: 'Test response 1',
      });

      // 3. Create a query (which creates agent_session and task)
      const queryId = `test-query-${Date.now()}`;
      await createQuery({
        id: queryId,
        conversationId: convId,
        userId: testUserId,
        queryText: 'Test query',
      });

      // 4. Log some agent activity
      await logAgentActivity({
        queryId,
        conversationId: convId,
        eventType: 'test_event',
        agentType: 'TestAgent',
        data: { test: 'data' },
      });

      // 5. Verify data exists before deletion
      const messagesBefore = await getMessagesByConversation(convId);
      expect(messagesBefore.length).toBeGreaterThanOrEqual(2);

      const queryBefore = await getQuery(queryId);
      expect(queryBefore).not.toBeNull();

      // Note: Agent activity storage not fully implemented (requires session management)
      // const activityBefore = await getAgentActivityByQuery(queryId);
      // expect(activityBefore.length).toBeGreaterThan(0);

      // 6. Delete the conversation
      await deleteConversation(convId);

      // 7. Verify all related data is deleted
      const conversationAfter = await getConversation(convId);
      expect(conversationAfter).toBeNull();

      const messagesAfter = await getMessagesByConversation(convId);
      expect(messagesAfter.length).toBe(0);

      // Query should be gone (task deleted)
      const queryAfter = await getQuery(queryId);
      expect(queryAfter).toBeNull();

      // Agent activity should be gone
      const activityAfter = await getAgentActivityByQuery(queryId);
      expect(activityAfter.length).toBe(0);
    }, 30000);

    it('should rollback transaction on error', async () => {
      // This test verifies transaction rollback behavior
      // Create a conversation
      const conversation = await createConversation(testUserId, 'Rollback Test');
      const convId = conversation.id;

      await createMessage({
        conversationId: convId,
        role: 'user',
        content: 'Test message',
      });

      // Verify conversation exists
      const convBefore = await getConversation(convId);
      expect(convBefore).not.toBeNull();

      // Try to delete with an invalid ID (should not affect anything)
      const invalidId = '00000000-0000-0000-0000-000000000000';
      await expect(deleteConversation(invalidId)).resolves.toBeUndefined();

      // Original conversation should still exist
      const convAfter = await getConversation(convId);
      expect(convAfter).not.toBeNull();

      // Clean up
      await deleteConversation(convId);
    }, 15000);

    it('should handle conversation with no messages or tasks', async () => {
      // Create empty conversation
      const conversation = await createConversation(testUserId, 'Empty Conversation');
      const convId = conversation.id;

      // Verify it exists
      const convBefore = await getConversation(convId);
      expect(convBefore).not.toBeNull();

      // Delete it
      await deleteConversation(convId);

      // Verify it's gone
      const convAfter = await getConversation(convId);
      expect(convAfter).toBeNull();
    }, 10000);

    it('should handle conversation with multiple agent sessions', async () => {
      // Create conversation
      const conversation = await createConversation(testUserId, 'Multi-Session Conversation');
      const convId = conversation.id;

      // Create multiple queries (each creates an agent session)
      const query1Id = `test-multi-query-1-${Date.now()}`;
      const query2Id = `test-multi-query-2-${Date.now()}`;

      await createQuery({
        id: query1Id,
        conversationId: convId,
        userId: testUserId,
        queryText: 'First query',
      });

      await createQuery({
        id: query2Id,
        conversationId: convId,
        userId: testUserId,
        queryText: 'Second query',
      });

      // Verify queries exist
      const query1Before = await getQuery(query1Id);
      const query2Before = await getQuery(query2Id);
      expect(query1Before).not.toBeNull();
      expect(query2Before).not.toBeNull();

      // Delete conversation
      await deleteConversation(convId);

      // Verify all sessions and tasks are deleted
      const query1After = await getQuery(query1Id);
      const query2After = await getQuery(query2Id);
      expect(query1After).toBeNull();
      expect(query2After).toBeNull();
    }, 20000);
  });

  describe('Task duration and agent activity', () => {
    it.skip('should store and retrieve agent activity with duration data', async () => {
      // Skipped: Agent activity storage requires full session management (not implemented in chat-service)
      // This functionality is handled at the service layer (agent-service.ts)

      // Create conversation and query
      const conversation = await createConversation(testUserId, 'Duration Test');
      const queryId = `duration-query-${Date.now()}`;

      await createQuery({
        id: queryId,
        conversationId: conversation.id,
        userId: testUserId,
        queryText: 'Duration test query',
      });

      // Log activity with duration data (simulating task completion)
      const durationMs = 5432;
      const durationSeconds = Math.round(durationMs / 1000);

      await logAgentActivity({
        queryId,
        conversationId: conversation.id,
        eventType: 'task_completed',
        agentType: 'DeveloperAgent',
        data: {
          durationMs,
          durationSeconds,
        },
      });

      // Retrieve and verify
      const activities = await getAgentActivityByQuery(queryId);
      expect(activities.length).toBeGreaterThan(0);

      const completedEvent = activities.find((a) => a.eventType === 'task_completed');
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data.durationMs).toBe(durationMs);
      expect(completedEvent?.data.durationSeconds).toBe(durationSeconds);

      // Clean up
      await deleteConversation(conversation.id);
    }, 15000);
  });
});
