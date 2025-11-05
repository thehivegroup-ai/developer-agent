import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageList from '../components/MessageList';
import { Message } from '../context/ChatContext';

// Mock the useChat hook
const mockUseChat = vi.fn();

vi.mock('../context/ChatContext', async () => {
  const actual = await vi.importActual('../context/ChatContext');
  return {
    ...actual,
    useChat: () => mockUseChat(),
  };
});

// Mock child components to simplify testing
vi.mock('../components/MessageItem', () => ({
  default: ({ message }: { message: Message }) => (
    <div data-testid={`message-${message.id}`}>{message.content}</div>
  ),
}));

vi.mock('../components/TypingIndicator', () => ({
  default: () => <div data-testid="typing-indicator">Typing...</div>,
}));

describe('MessageList', () => {
  const mockMessages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      agentType: null,
      metadata: {},
      createdAt: new Date('2024-01-01T10:00:00Z').toISOString(),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi there!',
      agentType: 'developer',
      metadata: {},
      createdAt: new Date('2024-01-01T10:00:05Z').toISOString(),
    },
    {
      id: '3',
      role: 'user',
      content: 'How are you?',
      agentType: null,
      metadata: {},
      createdAt: new Date('2024-01-01T10:00:10Z').toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.mockReturnValue({
      isLoading: false,
      conversations: [],
      currentConversation: null,
      messages: [],
      addMessage: vi.fn(),
      updateMessage: vi.fn(),
      selectConversation: vi.fn(),
      createConversation: vi.fn(),
      setTypingAgent: vi.fn(),
      typingAgent: null,
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no messages', () => {
      render(<MessageList messages={[]} />);

      expect(screen.getByText('💬 No messages yet')).toBeInTheDocument();
      expect(
        screen.getByText('Start a conversation by typing a message below')
      ).toBeInTheDocument();
    });

    it('should not render MessageItem components when empty', () => {
      render(<MessageList messages={[]} />);

      expect(screen.queryByTestId(/^message-/)).not.toBeInTheDocument();
    });
  });

  describe('Message rendering', () => {
    it('should render all messages', () => {
      render(<MessageList messages={mockMessages} />);

      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
      expect(screen.getByTestId('message-3')).toBeInTheDocument();
    });

    it('should render messages with correct content', () => {
      render(<MessageList messages={mockMessages} />);

      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
    });

    it('should render messages in order', () => {
      render(<MessageList messages={mockMessages} />);

      const messageElements = screen.getAllByTestId(/^message-/);
      expect(messageElements).toHaveLength(3);
      expect(messageElements[0]).toHaveAttribute('data-testid', 'message-1');
      expect(messageElements[1]).toHaveAttribute('data-testid', 'message-2');
      expect(messageElements[2]).toHaveAttribute('data-testid', 'message-3');
    });

    it('should not show empty state when messages exist', () => {
      render(<MessageList messages={mockMessages} />);

      expect(screen.queryByText('💬 No messages yet')).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should show typing indicator when loading', () => {
      mockUseChat.mockReturnValue({
        isLoading: true,
        conversations: [],
        currentConversation: null,
        messages: [],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });

      render(<MessageList messages={mockMessages} />);

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });

    it('should not show typing indicator when not loading', () => {
      mockUseChat.mockReturnValue({
        isLoading: false,
        conversations: [],
        currentConversation: null,
        messages: [],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });

      render(<MessageList messages={mockMessages} />);

      expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    });

    it('should show messages and typing indicator together', () => {
      mockUseChat.mockReturnValue({
        isLoading: true,
        conversations: [],
        currentConversation: null,
        messages: [],
        addMessage: vi.fn(),
        updateMessage: vi.fn(),
        selectConversation: vi.fn(),
        createConversation: vi.fn(),
        setTypingAgent: vi.fn(),
        typingAgent: null,
      });

      render(<MessageList messages={mockMessages} />);

      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });
  });

  describe('Single message', () => {
    it('should render a single message correctly', () => {
      const singleMessage = [mockMessages[0]];
      render(<MessageList messages={singleMessage} />);

      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.queryByTestId('message-2')).not.toBeInTheDocument();
    });
  });

  describe('Scroll behavior', () => {
    it('should have scroll target element', () => {
      const { container } = render(<MessageList messages={mockMessages} />);

      // The messagesEndRef creates a div that can be used for scrolling
      const messageList = container.querySelector('.message-list');
      expect(messageList).toBeInTheDocument();
    });
  });
});
