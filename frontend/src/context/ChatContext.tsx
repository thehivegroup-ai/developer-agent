import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentType: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

interface ChatContextType {
  username: string;
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  createConversation: (title?: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  addAssistantMessage: (content: string, metadata?: Record<string, unknown>) => void;
  setIsLoading: (loading: boolean) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children, username }: { children: ReactNode; username: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = '/api/chat';

  useEffect(() => {
    refreshConversations();
  }, [username]);

  const refreshConversations = async () => {
    try {
      const response = await axios.get<{ conversations: Conversation[] }>(
        `${API_BASE}/conversations?username=${username}`
      );
      setConversations(response.data.conversations);

      // Auto-select first conversation if none selected
      if (!currentConversation && response.data.conversations.length > 0) {
        await selectConversation(response.data.conversations[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      setError('Failed to load conversations');
    }
  };

  const createConversation = async (title?: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post<{
        conversationId: string;
        title: string | null;
        createdAt: string;
      }>(`${API_BASE}/conversations`, {
        username,
        title: title || 'New Conversation',
      });

      const newConv: Conversation = {
        id: response.data.conversationId,
        title: response.data.title,
        createdAt: response.data.createdAt,
        updatedAt: response.data.createdAt,
      };

      setConversations([newConv, ...conversations]);
      setCurrentConversation(newConv);
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setError('Failed to create conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = async (id: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get<{ messages: Message[] }>(
        `${API_BASE}/conversations/${id}/messages`
      );

      const conv = conversations.find((c) => c.id === id);
      if (conv) {
        setCurrentConversation(conv);
        setMessages(response.data.messages);
        setError(null);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (message: string) => {
    if (!currentConversation) {
      // Create a new conversation if none exists
      await createConversation(message.substring(0, 50));
      // The message will be sent after conversation is created
      return;
    }

    try {
      // Clear loading state for any previous message before starting new one
      setIsLoading(true);

      // Optimistically add user message to UI
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        agentType: null,
        metadata: {},
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const response = await axios.post<{
        queryId: string;
        conversationId: string;
        status: string;
        message: string;
      }>(`${API_BASE}/message`, {
        username,
        conversationId: currentConversation.id,
        message,
      });

      console.log('📤 Sent message:', message, 'Query ID:', response.data.queryId);

      // ✅ Keep isLoading true - it will be cleared by query:completed WebSocket event
      // The assistant response will be added by the query:completed WebSocket handler

      setError(null);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
      setIsLoading(false); // Clear loading on error
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => !m.id.startsWith('temp-')));
    }
  };

  const addAssistantMessage = (content: string, metadata?: Record<string, unknown>) => {
    // Only add message if we're still in the same conversation
    // Check if metadata has conversationId and if it matches current conversation
    if (
      metadata?.conversationId &&
      currentConversation &&
      metadata.conversationId !== currentConversation.id
    ) {
      console.log(
        '⚠️ Ignoring message for different conversation:',
        metadata.conversationId,
        'vs',
        currentConversation.id
      );
      return;
    }

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content,
      agentType: 'system',
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
    console.log(
      `✅ Added assistant message to chat (${content.length} chars):`,
      content.substring(0, 100)
    );
  };

  return (
    <ChatContext.Provider
      value={{
        username,
        conversations,
        currentConversation,
        messages,
        isLoading,
        error,
        createConversation,
        selectConversation,
        sendMessage,
        refreshConversations,
        addAssistantMessage,
        setIsLoading,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
