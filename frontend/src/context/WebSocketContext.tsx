import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useChat } from './ChatContext';

export interface WebSocketEvent {
  type: string;
  conversationId: string;
  queryId?: string;
  timestamp: string;
  data: unknown;
}

export interface AgentActivity {
  id: string;
  type: string;
  timestamp: string;
  data: unknown;
}

interface WebSocketContextType {
  connected: boolean;
  activities: AgentActivity[];
  clearActivities: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { currentConversation } = useChat();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activities, setActivities] = useState<AgentActivity[]>([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3000', {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket || !currentConversation) return;

    // Join current conversation room
    console.log(`📬 Joining conversation: ${currentConversation.id}`);
    socket.emit('join:conversation', {
      conversationId: currentConversation.id,
      username: 'frontend-client',
    });

    // Listen for room join confirmation
    socket.on('joined', (data) => {
      console.log('✅ Joined conversation room:', data);
    });

    // Event handlers
    const handleEvent = (eventType: string) => (data: WebSocketEvent) => {
      console.log(`📡 ${eventType}:`, data);
      setActivities((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random()}`,
          type: eventType,
          timestamp: data.timestamp,
          data: data.data,
        },
      ]);
    };

    socket.on('agent:spawned', handleEvent('agent:spawned'));
    socket.on('agent:status', handleEvent('agent:status'));
    socket.on('agent:message', handleEvent('agent:message'));
    socket.on('task:created', handleEvent('task:created'));
    socket.on('task:updated', handleEvent('task:updated'));
    socket.on('query:progress', handleEvent('query:progress'));
    socket.on('query:completed', handleEvent('query:completed'));
    socket.on('error', handleEvent('error'));

    return () => {
      // Leave conversation room when switching
      socket.emit('leave:conversation', {
        conversationId: currentConversation.id,
      });

      // Remove event listeners
      socket.off('joined');
      socket.off('agent:spawned');
      socket.off('agent:status');
      socket.off('agent:message');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('query:progress');
      socket.off('query:completed');
      socket.off('error');
    };
  }, [socket, currentConversation]);

  const clearActivities = () => {
    setActivities([]);
  };

  return (
    <WebSocketContext.Provider value={{ connected, activities, clearActivities }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
