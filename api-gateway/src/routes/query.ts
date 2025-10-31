import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Request/Response types
export interface QueryRequest {
  query: string;
  userId?: string;
  threadId?: string;
}

export interface QueryResponse {
  queryId: string;
  status: 'processing' | 'completed' | 'failed';
  message: string;
  result?: unknown;
}

export interface QueryStatusResponse {
  queryId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  tasks?: Array<{
    id: string;
    description: string;
    status: string;
    assignedTo: string;
  }>;
  result?: unknown;
  error?: string;
}

// In-memory query storage (TODO: Move to PostgreSQL)
const queries = new Map<
  string,
  {
    id: string;
    query: string;
    userId: string;
    threadId: string;
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    tasks: Array<any>;
    result?: unknown;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
  }
>();

export async function queryRoutes(fastify: FastifyInstance) {
  // Submit a new query
  fastify.post<{ Body: QueryRequest }>(
    '/api/query',
    {
      schema: {
        body: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', minLength: 1 },
            userId: { type: 'string' },
            threadId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: QueryRequest }>, reply: FastifyReply) => {
      const { query, userId = 'anonymous', threadId = `thread-${Date.now()}` } = request.body;

      // Generate query ID
      const queryId = `query-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Store query
      queries.set(queryId, {
        id: queryId,
        query,
        userId,
        threadId,
        status: 'processing',
        progress: 0,
        tasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      fastify.log.info({ queryId, query, userId, threadId }, 'New query received');

      // TODO: Send query to Developer Agent
      // For now, simulate processing
      setTimeout(() => {
        const stored = queries.get(queryId);
        if (stored) {
          stored.status = 'completed';
          stored.progress = 100;
          stored.result = {
            message: 'Query processed successfully (placeholder)',
            data: {},
          };
          stored.updatedAt = new Date();
        }
      }, 2000);

      reply.code(202).send({
        queryId,
        status: 'processing',
        message: 'Query submitted successfully',
      } as QueryResponse);
    }
  );

  // Get query status
  fastify.get<{ Params: { queryId: string } }>(
    '/api/query/:queryId',
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

      const queryData = queries.get(queryId);

      if (!queryData) {
        return reply.code(404).send({
          error: 'Query not found',
          queryId,
        });
      }

      reply.send({
        queryId: queryData.id,
        status: queryData.status,
        progress: queryData.progress,
        tasks: queryData.tasks,
        result: queryData.result,
        error: queryData.error,
      } as QueryStatusResponse);
    }
  );

  // Get query result (convenience endpoint)
  fastify.get<{ Params: { queryId: string } }>(
    '/api/query/:queryId/result',
    async (request: FastifyRequest<{ Params: { queryId: string } }>, reply: FastifyReply) => {
      const { queryId } = request.params;

      const queryData = queries.get(queryId);

      if (!queryData) {
        return reply.code(404).send({
          error: 'Query not found',
          queryId,
        });
      }

      if (queryData.status === 'processing') {
        return reply.code(202).send({
          message: 'Query still processing',
          status: queryData.status,
          progress: queryData.progress,
        });
      }

      if (queryData.status === 'failed') {
        return reply.code(500).send({
          error: queryData.error || 'Query processing failed',
        });
      }

      reply.send({
        result: queryData.result,
        completedAt: queryData.updatedAt,
      });
    }
  );
}
