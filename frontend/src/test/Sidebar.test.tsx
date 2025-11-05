import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../components/Sidebar';

const mockConversations = [
  {
    id: 'conv-1',
    title: 'First Conversation',
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'conv-2',
    title: 'Second Conversation',
    createdAt: new Date('2024-01-02').toISOString(),
    updatedAt: new Date('2024-01-02').toISOString(),
  },
  {
    id: 'conv-3',
    title: 'Test Debug Session',
    createdAt: new Date('2024-01-03').toISOString(),
    updatedAt: new Date('2024-01-03').toISOString(),
  },
];

const mockSelectConversation = vi.fn();
const mockCreateConversation = vi.fn();

// Mock ChatContext
vi.mock('../context/ChatContext', () => ({
  useChat: () => ({
    conversations: mockConversations,
    currentConversation: mockConversations[0],
    selectConversation: mockSelectConversation,
    createConversation: mockCreateConversation,
    messages: [],
    addMessage: vi.fn(),
    updateMessage: vi.fn(),
    setTypingAgent: vi.fn(),
    typingAgent: null,
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render header with title', () => {
      render(<Sidebar />);
      expect(screen.getByText('🤖 Developer Agent')).toBeInTheDocument();
    });

    it('should render New Chat button', () => {
      render(<Sidebar />);
      expect(screen.getByText('+ New Chat')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<Sidebar />);
      const searchInput = screen.getByPlaceholderText('🔍 Search conversations...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should show "No matches found" for empty search results', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);

      const searchInput = screen.getByPlaceholderText('🔍 Search conversations...');
      await user.type(searchInput, 'NonexistentConversation');

      expect(screen.getByText('No matches found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term')).toBeInTheDocument();
    });
  });
});
