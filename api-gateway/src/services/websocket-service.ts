/**
 * WebSocket Service - Manages real-time communication with clients
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

// WebSocket event types
export type WebSocketEvent =
  | 'agent:spawned'
  | 'agent:status'
  | 'agent:message'
  | 'task:created'
  | 'task:updated'
  | 'query:progress'
  | 'query:completed'
  | 'error';

export interface WebSocketEventData {
  type: WebSocketEvent;
  conversationId: string;
  queryId?: string;
  timestamp: string;
  data: unknown;
}

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, Set<string>> = new Map(); // conversationId -> Set<socketId>

  /**
   * Initialize Socket.IO server
   */
  initialize(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*', // In production, restrict this to specific origins
        methods: ['GET', 'POST'],
      },
      path: '/socket.io/',
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket service initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle client joining a conversation room
      socket.on('join:conversation', (data: { conversationId: string; username?: string }) => {
        const { conversationId, username } = data;

        // Join the room
        socket.join(conversationId);

        // Track the connection
        if (!this.connectedClients.has(conversationId)) {
          this.connectedClients.set(conversationId, new Set());
        }
        this.connectedClients.get(conversationId)?.add(socket.id);

        console.log(
          `👥 Client ${socket.id} (${username || 'anonymous'}) joined conversation ${conversationId}`
        );

        // Send acknowledgment
        socket.emit('joined', { conversationId, timestamp: new Date().toISOString() });
      });

      // Handle client leaving a conversation room
      socket.on('leave:conversation', (data: { conversationId: string }) => {
        const { conversationId } = data;

        socket.leave(conversationId);
        this.connectedClients.get(conversationId)?.delete(socket.id);

        console.log(`👋 Client ${socket.id} left conversation ${conversationId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);

        // Clean up from all rooms
        this.connectedClients.forEach((clients, conversationId) => {
          if (clients.has(socket.id)) {
            clients.delete(socket.id);
            if (clients.size === 0) {
              this.connectedClients.delete(conversationId);
            }
          }
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Emit an event to a specific conversation room
   */
  emitToConversation(conversationId: string, event: WebSocketEvent, data: unknown): void {
    if (!this.io) {
      console.warn('⚠️ WebSocket service not initialized');
      return;
    }

    const eventData: WebSocketEventData = {
      type: event,
      conversationId,
      timestamp: new Date().toISOString(),
      data,
    };

    this.io.to(conversationId).emit(event, eventData);

    const clientCount = this.connectedClients.get(conversationId)?.size || 0;
    console.log(`📡 Emitted ${event} to conversation ${conversationId} (${clientCount} clients)`);
  }

  /**
   * Emit agent spawned event
   */
  emitAgentSpawned(conversationId: string, agentType: string, agentId: string): void {
    this.emitToConversation(conversationId, 'agent:spawned', {
      agentType,
      agentId,
      message: `${agentType} agent spawned`,
    });
  }

  /**
   * Emit agent status update
   */
  emitAgentStatus(
    conversationId: string,
    agentType: string,
    agentId: string,
    status: string,
    details?: string
  ): void {
    this.emitToConversation(conversationId, 'agent:status', {
      agentType,
      agentId,
      status,
      details,
    });
  }

  /**
   * Emit agent message
   */
  emitAgentMessage(
    conversationId: string,
    agentType: string,
    agentId: string,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.emitToConversation(conversationId, 'agent:message', {
      agentType,
      agentId,
      message,
      metadata,
    });
  }

  /**
   * Emit task created event
   */
  emitTaskCreated(
    conversationId: string,
    taskId: string,
    description: string,
    assignedTo: string
  ): void {
    this.emitToConversation(conversationId, 'task:created', {
      taskId,
      description,
      assignedTo,
    });
  }

  /**
   * Emit task updated event
   */
  emitTaskUpdated(
    conversationId: string,
    taskId: string,
    status: string,
    progress?: number,
    result?: unknown
  ): void {
    this.emitToConversation(conversationId, 'task:updated', {
      taskId,
      status,
      progress,
      result,
    });
  }

  /**
   * Emit query progress event
   */
  emitQueryProgress(
    conversationId: string,
    queryId: string,
    progress: number,
    message?: string
  ): void {
    this.emitToConversation(conversationId, 'query:progress', {
      queryId,
      progress,
      message,
    });
  }

  /**
   * Emit query completed event
   */
  emitQueryCompleted(
    conversationId: string,
    queryId: string,
    status: 'completed' | 'failed',
    result?: unknown,
    error?: string
  ): void {
    this.emitToConversation(conversationId, 'query:completed', {
      queryId,
      status,
      result,
      error,
    });
  }

  /**
   * Emit error event
   */
  emitError(conversationId: string, error: string, details?: unknown): void {
    this.emitToConversation(conversationId, 'error', {
      error,
      details,
    });
  }

  /**
   * Get connected client count for a conversation
   */
  getClientCount(conversationId: string): number {
    return this.connectedClients.get(conversationId)?.size || 0;
  }

  /**
   * Check if any clients are connected to a conversation
   */
  hasConnectedClients(conversationId: string): boolean {
    return this.getClientCount(conversationId) > 0;
  }

  /**
   * Get Socket.IO server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
