import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react';
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
  socket: Socket | null;
  clearActivities: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
  conversationId: string | null;
}

export function WebSocketProvider({ children, conversationId }: WebSocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const { addAssistantMessage, setIsLoading } = useChat();

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
    if (!socket || !conversationId) return;

    // Join current conversation room
    console.log(`📬 Joining conversation: ${conversationId}`);
    socket.emit('join:conversation', {
      conversationId: conversationId,
      username: 'frontend-client',
    });

    // Listen for room join confirmation
    socket.on('joined', (data) => {
      console.log('✅ Joined conversation room:', data);
    });

    // Helper to extract unique key for update-in-place logic
    const getActivityKey = (data: any, queryId?: string): string | null => {
      if (data?.agentId) return `agent:${data.agentId}`;
      if (data?.taskId) return `task:${data.taskId}`;
      // Check queryId from data first (query:progress has it here), then top-level
      if (data?.queryId) return `query:${data.queryId}`;
      if (queryId) return `query:${queryId}`;
      return null;
    };

    // Event handlers with update-in-place logic
    const handleEvent = (eventType: string) => (data: WebSocketEvent) => {
      console.log(`📡 ${eventType}:`, data);

      setActivities((prev) => {
        const eventData = data.data as any;

        // Extract identifier for update-in-place logic
        // Pass both eventData and top-level queryId to check both locations
        const updateKey = getActivityKey(eventData, data.queryId);

        console.log(
          `🔑 Update key for ${eventType}:`,
          updateKey,
          'queryId:',
          data.queryId,
          'data:',
          eventData
        );

        // If we have an update key, check if activity exists and update it
        if (updateKey) {
          const existingIndex = prev.findIndex((activity) => {
            // For matching, use the activity.id directly if it's already a key format
            // Otherwise extract from data
            const activityKey = activity.id.includes(':')
              ? activity.id
              : getActivityKey(activity.data as any, undefined);

            console.log(
              `  Comparing activity ${activity.id} (key: ${activityKey}) with updateKey: ${updateKey}`
            );
            return activityKey === updateKey;
          });

          if (existingIndex !== -1) {
            console.log(`✅ Updating existing activity at index ${existingIndex}`);
            // Update existing activity in place
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              type: eventType,
              timestamp: data.timestamp,
              data: data.data,
            };
            return updated;
          } else {
            console.log(`➕ Adding new activity with key: ${updateKey}`);
          }
        }

        // Otherwise append as new activity
        return [
          ...prev,
          {
            id: updateKey || `${Date.now()}-${Math.random()}`,
            type: eventType,
            timestamp: data.timestamp,
            data: data.data,
          },
        ];
      });
    };

    socket.on('agent:spawned', handleEvent('agent:spawned'));
    socket.on('agent:status', handleEvent('agent:status'));
    socket.on('agent:message', handleEvent('agent:message'));
    socket.on('task:created', handleEvent('task:created'));
    socket.on('task:updated', handleEvent('task:updated'));
    socket.on('query:progress', handleEvent('query:progress'));

    // Special handler for query:completed to extract and display result
    socket.on('query:completed', (data: WebSocketEvent) => {
      console.log('🎯 Query completed event received:', data);

      // Still add to activities
      handleEvent('query:completed')(data);

      // Clear loading indicator when query completes
      setIsLoading(false);

      // Extract and format the result for chat display
      try {
        const eventData = data.data as any;

        if (eventData.status !== 'completed' || !eventData.result) {
          console.warn('Query completed but no result or failed status');
          return;
        }

        // Extract and decode result from A2A Artifact format
        const artifacts = eventData.result as Array<{
          id: string;
          mimeType: string;
          uri: string;
          name?: string;
        }>;

        if (!Array.isArray(artifacts) || artifacts.length === 0) {
          console.warn('No artifacts in result');
          return;
        }

        const resultArtifact = artifacts[0];
        if (!resultArtifact?.uri) {
          console.warn('No URI in artifact');
          return;
        }

        // Decode the data URI
        const uriMatch = resultArtifact.uri.match(/^data:[^,]*,(.+)$/);
        if (!uriMatch) {
          console.warn('Invalid data URI format');
          return;
        }

        const dataPart = uriMatch[1];
        let decodedJson: string;

        if (resultArtifact.uri.includes('base64')) {
          decodedJson = atob(dataPart);
        } else {
          decodedJson = decodeURIComponent(dataPart);
        }

        const result = JSON.parse(decodedJson) as {
          sessionId: string;
          status: string;
          answer?: string; // LLM synthesized answer
          results: Array<{
            agentId?: string;
            agentType: string;
            data: {
              answer?: string; // LLM answer in data object
              repositories?: Array<{ fullName: string; owner: string; name: string }>;
              [key: string]: any;
            };
          }>;
        };

        console.log('📦 Decoded result:', result);

        // Format the response for display
        let responseContent = '';

        // First, check if there's a top-level LLM answer (new format)
        if (result.answer) {
          responseContent = result.answer;
        } else if (result.results && result.results.length > 0) {
          // Check for LLM answer in results array
          const llmResult = result.results.find((r) => r.agentType === 'llm');
          if (llmResult?.data?.answer) {
            responseContent = llmResult.data.answer;
          } else {
            // Fall back to old format for GitHub agent
            for (const agentResult of result.results) {
              if (agentResult.agentType === 'github' && agentResult.data.repositories) {
                const repos = agentResult.data.repositories;
                responseContent += `I found ${repos.length} repositories:\n\n`;
                for (const repo of repos) {
                  responseContent += `• ${repo.fullName}\n`;
                }
              } else {
                // Generic data display for other agent types
                responseContent += JSON.stringify(agentResult.data, null, 2);
              }
            }
          }
        }

        // Log first 200 chars of response for debugging
        console.log(
          `📝 Response preview (${responseContent.length} chars):`,
          responseContent.substring(0, 200)
        );

        if (!responseContent) {
          responseContent = 'Query completed successfully, but no data to display.';
        }

        // Add assistant message to chat with conversationId for validation
        addAssistantMessage(responseContent, {
          queryId: eventData.queryId,
          conversationId: eventData.conversationId, // Pass conversation ID to check if still relevant
        });
        console.log('✅ Added assistant message to chat');
      } catch (err) {
        console.error('Failed to process query:completed event:', err);
      }
    });

    socket.on('error', handleEvent('error'));

    return () => {
      // Leave conversation room when switching
      socket.emit('leave:conversation', {
        conversationId: conversationId,
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
  }, [socket, conversationId]);

  const clearActivities = () => {
    setActivities([]);
  };

  const contextValue = useMemo(
    () => ({ connected, activities, socket, clearActivities }),
    [connected, activities, socket]
  );

  return <WebSocketContext.Provider value={contextValue}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}
