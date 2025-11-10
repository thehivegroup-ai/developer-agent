/**
 * Chat API Routes - Handles conversation and messaging endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getOrCreateUser,
  createConversation,
  getConversationsByUser,
  getConversation,
  createMessage,
  getMessagesByConversation,
  createQuery,
  getQuery,
  type Conversation,
  type Message,
} from '@developer-agent/shared';
import { websocketService } from '../services/websocket-service.js';
import { getAgentService } from '../services/agent-service.js';

// Request/Response types
export interface SendMessageRequest {
  username: string;
  conversationId?: string;
  message: string;
}

export interface SendMessageResponse {
  queryId: string;
  conversationId: string;
  status: 'processing';
  message: string;
}

export interface GetConversationsResponse {
  conversations: Array<{
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    messageCount?: number;
  }>;
}

export interface GetMessagesResponse {
  messages: Array<{
    id: string;
    role: string;
    content: string;
    agentType: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
}

export interface CreateConversationRequest {
  username: string;
  title?: string;
}

export interface CreateConversationResponse {
  conversationId: string;
  title: string | null;
  createdAt: string;
}

/**
 * Register chat routes
 */
export async function chatRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/chat/message
   * Send a message (query) to the agent system
   */
  fastify.post<{ Body: SendMessageRequest }>(
    '/api/chat/message',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'message'],
          properties: {
            username: { type: 'string', minLength: 1 },
            conversationId: { type: 'string', format: 'uuid' },
            message: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: SendMessageRequest }>, reply: FastifyReply) => {
      const { username, conversationId, message } = request.body;

      try {
        // Get or create user
        const user = await getOrCreateUser(username);

        // Get or create conversation
        let conversation;
        if (conversationId) {
          conversation = await getConversation(conversationId);
          if (!conversation || conversation.userId !== user.id) {
            return reply.code(404).send({
              error: 'Conversation not found or access denied',
            });
          }
        } else {
          // Create new conversation with first message as title
          const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
          conversation = await createConversation(user.id, title);
        }

        // Store user message
        await createMessage({
          conversationId: conversation.id,
          role: 'user',
          content: message,
        });

        // Create query record for async processing
        const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await createQuery({
          id: queryId,
          conversationId: conversation.id,
          userId: user.id,
          queryText: message,
        });

        fastify.log.info(
          { queryId, username, conversationId: conversation.id, message },
          'New message received'
        );

        // Emit WebSocket event for query started
        websocketService.emitQueryProgress(
          conversation.id,
          queryId,
          0,
          'Query received and queued for processing'
        );

        // Send immediate response
        await reply.code(202).send({
          queryId,
          conversationId: conversation.id,
          status: 'processing',
          message: 'Message received and processing started',
        } as SendMessageResponse);

        // Process query asynchronously (don't await - fire and forget)
        console.log('[ChatRoute] Starting async query processing for:', queryId);
        const agentService = getAgentService();
        void agentService
          .processQuery({
            queryId,
            query: message,
            userId: user.id,
            threadId: conversation.id,
          })
          .then(() => {
            console.log('[ChatRoute] Query processing completed successfully:', queryId);
          })
          .catch((error) => {
            console.error('[ChatRoute] Error in async query processing:', queryId, error);
            fastify.log.error({ error, queryId }, 'Error in async query processing');
          });
      } catch (error) {
        fastify.log.error({ error, username, conversationId, message }, 'Error processing message');
        await reply.code(500).send({
          error: 'Failed to process message',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/chat/conversations
   * Get all conversations for a user
   */
  fastify.get<{ Querystring: { username: string } }>(
    '/api/chat/conversations',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: { username: string } }>, reply: FastifyReply) => {
      const { username } = request.query;

      try {
        const user = await getOrCreateUser(username);
        const conversations = await getConversationsByUser(user.id);

        // TODO: Optionally get message count for each conversation

        await reply.send({
          conversations: conversations.map((conv: Conversation) => ({
            id: conv.id,
            title: conv.title,
            createdAt: conv.createdAt.toISOString(),
            updatedAt: conv.updatedAt.toISOString(),
          })),
        } as GetConversationsResponse);
      } catch (error) {
        fastify.log.error({ error, username }, 'Error fetching conversations');
        await reply.code(500).send({
          error: 'Failed to fetch conversations',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/chat/conversations/:conversationId/messages
   * Get all messages in a conversation
   */
  fastify.get<{ Params: { conversationId: string }; Querystring: { limit?: string } }>(
    '/api/chat/conversations/:conversationId/messages',
    {
      schema: {
        params: {
          type: 'object',
          required: ['conversationId'],
          properties: {
            conversationId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Params: { conversationId: string };
        Querystring: { limit?: string };
      }>,
      reply: FastifyReply
    ) => {
      const conversationId = request.params.conversationId;
      const limit = request.query.limit ? parseInt(request.query.limit) : 100;

      try {
        // Check if conversation exists
        const conversation = await getConversation(conversationId);
        if (!conversation) {
          return reply.code(404).send({ error: 'Conversation not found' });
        }

        const messages = await getMessagesByConversation(conversationId, limit);

        await reply.send({
          messages: messages.map((msg: Message) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            agentType: (msg.metadata?.agentType as string) || null,
            metadata: msg.metadata,
            createdAt: msg.createdAt.toISOString(),
          })),
        } as GetMessagesResponse);
      } catch (error) {
        fastify.log.error({ error, conversationId }, 'Error fetching messages');
        await reply.code(500).send({
          error: 'Failed to fetch messages',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * POST /api/chat/conversations
   * Create a new conversation
   */
  fastify.post<{ Body: CreateConversationRequest }>(
    '/api/chat/conversations',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username'],
          properties: {
            username: { type: 'string', minLength: 1 },
            title: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: CreateConversationRequest }>, reply: FastifyReply) => {
      const { username, title } = request.body;

      try {
        const user = await getOrCreateUser(username);
        const conversation = await createConversation(user.id, title);

        await reply.code(201).send({
          conversationId: conversation.id,
          title: conversation.title,
          createdAt: conversation.createdAt.toISOString(),
        } as CreateConversationResponse);
      } catch (error) {
        fastify.log.error({ error, username, title }, 'Error creating conversation');
        await reply.code(500).send({
          error: 'Failed to create conversation',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/chat/query/:queryId
   * Get query status and result
   */
  fastify.get<{ Params: { queryId: string } }>(
    '/api/chat/query/:queryId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['queryId'],
          properties: {
            queryId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { queryId: string } }>, reply: FastifyReply) => {
      const { queryId } = request.params;

      try {
        const query = await getQuery(queryId);

        if (!query) {
          return reply.code(404).send({ error: 'Query not found' });
        }

        await reply.send({
          queryId: query.id,
          conversationId: query.conversationId,
          status: query.status,
          progress: query.progress,
          result: query.result,
          error: query.error,
          createdAt: query.createdAt.toISOString(),
          updatedAt: query.updatedAt.toISOString(),
          completedAt: query.completedAt?.toISOString(),
        });
      } catch (error) {
        fastify.log.error({ error, queryId }, 'Error fetching query status');
        await reply.code(500).send({
          error: 'Failed to fetch query status',
          details: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}
