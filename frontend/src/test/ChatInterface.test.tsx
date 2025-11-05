import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChatInterface from '../components/ChatInterface';
import type { Message, Conversation } from '../context/ChatContext';

// Mock child components
vi.mock('../components/MessageList', () => ({
  default: ({ messages }: { messages: Message[] }) => (
    <div data-testid="message-list">MessageList: {messages.length} messages</div>
  ),
}));

vi.mock('../components/MessageInput', () => ({
  default: () => <div data-testid="message-input">MessageInput</div>,
}));

vi.mock('../components/AgentActivity', () => ({
  default: () => <div data-testid="agent-activity">AgentActivity</div>,
}));

// Mock ChatContext
const mockUseChat = vi.fn();

vi.mock('../context/ChatContext', async () => {
  const actual = await vi.importActual('../context/ChatContext');
  return {
    ...actual,
    useChat: () => mockUseChat(),
  };
});

describe('ChatInterface', () => {
  const mockConversation: Conversation = {
    id: 'conv-1',
    title: 'Test Conversation',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  };

  const mockMessages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      agentType: null,
      metadata: {},
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('No conversation selected', () => {
    beforeEach(() => {
      mockUseChat.mockReturnValue({
        currentConversation: null,
        messages: [],
        isLoading: false,
        conversations: [],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });
    });

    it('should show welcome message when no conversation', () => {
      render(<ChatInterface />);

      expect(screen.getByText('👋 Welcome to Developer Agent')).toBeInTheDocument();
    });

    it('should show instruction text', () => {
      render(<ChatInterface />);

      expect(screen.getByText(/Select a conversation from the sidebar/)).toBeInTheDocument();
    });

    it('should not render MessageList when no conversation', () => {
      render(<ChatInterface />);

      expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
    });

    it('should not render MessageInput when no conversation', () => {
      render(<ChatInterface />);

      expect(screen.queryByTestId('message-input')).not.toBeInTheDocument();
    });

    it('should not render AgentActivity when no conversation', () => {
      render(<ChatInterface />);

      expect(screen.queryByTestId('agent-activity')).not.toBeInTheDocument();
    });
  });

  describe('Active conversation', () => {
    beforeEach(() => {
      mockUseChat.mockReturnValue({
        currentConversation: mockConversation,
        messages: mockMessages,
        isLoading: false,
        conversations: [mockConversation],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });
    });

    it('should show conversation title', () => {
      render(<ChatInterface />);

      expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    });

    it('should show default title for untitled conversation', () => {
      mockUseChat.mockReturnValue({
        currentConversation: { ...mockConversation, title: '' },
        messages: mockMessages,
        isLoading: false,
        conversations: [mockConversation],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });

      render(<ChatInterface />);

      expect(screen.getByText('Untitled Conversation')).toBeInTheDocument();
    });

    it('should render MessageList component', () => {
      render(<ChatInterface />);

      expect(screen.getByTestId('message-list')).toBeInTheDocument();
    });

    it('should render MessageInput component', () => {
      render(<ChatInterface />);

      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    it('should render AgentActivity component', () => {
      render(<ChatInterface />);

      expect(screen.getByTestId('agent-activity')).toBeInTheDocument();
    });

    it('should not show welcome message with active conversation', () => {
      render(<ChatInterface />);

      expect(screen.queryByText('👋 Welcome to Developer Agent')).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show loading indicator when loading', () => {
      mockUseChat.mockReturnValue({
        currentConversation: mockConversation,
        messages: mockMessages,
        isLoading: true,
        conversations: [mockConversation],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });

      render(<ChatInterface />);

      expect(screen.getByText('⏳ Loading...')).toBeInTheDocument();
    });

    it('should not show loading indicator when not loading', () => {
      mockUseChat.mockReturnValue({
        currentConversation: mockConversation,
        messages: mockMessages,
        isLoading: false,
        conversations: [mockConversation],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });

      render(<ChatInterface />);

      expect(screen.queryByText('⏳ Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Layout structure', () => {
    beforeEach(() => {
      mockUseChat.mockReturnValue({
        currentConversation: mockConversation,
        messages: mockMessages,
        isLoading: false,
        conversations: [mockConversation],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });
    });

    it('should have chat-interface container', () => {
      const { container } = render(<ChatInterface />);

      expect(container.querySelector('.chat-interface')).toBeInTheDocument();
    });

    it('should have chat-header section', () => {
      const { container } = render(<ChatInterface />);

      expect(container.querySelector('.chat-header')).toBeInTheDocument();
    });

    it('should have chat-main section', () => {
      const { container } = render(<ChatInterface />);

      expect(container.querySelector('.chat-main')).toBeInTheDocument();
    });

    it('should have chat-messages section', () => {
      const { container } = render(<ChatInterface />);

      expect(container.querySelector('.chat-messages')).toBeInTheDocument();
    });

    it('should have chat-activity section', () => {
      const { container } = render(<ChatInterface />);

      expect(container.querySelector('.chat-activity')).toBeInTheDocument();
    });
  });
});
