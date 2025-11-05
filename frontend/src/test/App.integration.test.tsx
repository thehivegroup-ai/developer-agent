import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import axios from 'axios';

// Mock axios for API calls
vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  close: vi.fn(),
  id: 'mock-socket-id',
};

vi.mock('socket.io-client', () => ({
  io: () => mockSocket,
}));

describe('App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up logged-in state for all integration tests
    localStorage.setItem('username', 'testuser');

    // Mock axios responses with proper structure
    (axios.get as any).mockResolvedValue({
      data: { conversations: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });

    (axios.post as any).mockResolvedValue({
      data: { conversationId: 'test-conv-id' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
  });

  afterEach(() => {
    // Clean up
    localStorage.clear();
  });

  describe('App Rendering', () => {
    it('should render the main app structure', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // Should have the main app container
      expect(container.querySelector('.app')).toBeInTheDocument();
    });

    it('should render sidebar', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(container.querySelector('.sidebar')).toBeInTheDocument();
    });

    it('should render chat interface', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(container.querySelector('.chat-interface')).toBeInTheDocument();
    });

    it('should render within error boundary', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // Should render without errors
      expect(screen.queryByText('🚫 Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('should show Developer Agent header', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('🤖 Developer Agent')).toBeInTheDocument();
    });

    it('should show New Chat button', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('+ New Chat')).toBeInTheDocument();
    });

    it('should show welcome message initially', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('👋 Welcome to Developer Agent')).toBeInTheDocument();
    });

    it('should show username in footer', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('👤 testuser')).toBeInTheDocument();
    });

    it('should show logout button', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have sidebar on the left', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const sidebar = container.querySelector('.sidebar');
      expect(sidebar).toBeInTheDocument();
    });

    it('should have chat interface in center', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const chatInterface = container.querySelector('.chat-interface');
      expect(chatInterface).toBeInTheDocument();
    });

    it('should render all major components', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // Sidebar
      expect(container.querySelector('.sidebar')).toBeInTheDocument();

      // Chat interface
      expect(container.querySelector('.chat-interface')).toBeInTheDocument();

      // Footer
      expect(container.querySelector('.app-footer')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should allow typing in search input', async () => {
      const user = userEvent.setup();
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const searchInput = screen.getByPlaceholderText('🔍 Search conversations...');
      await user.type(searchInput, 'test');

      expect(searchInput).toHaveValue('test');
    });

    it('should show no conversations empty state', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('should show logout functionality', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();

      // App should be visible before logout
      expect(container.querySelector('.app')).toBeInTheDocument();
    });
  });

  describe('Responsive Elements', () => {
    it('should have search functionality in sidebar', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const searchInput = screen.getByPlaceholderText('🔍 Search conversations...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should show appropriate empty states', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // Conversations empty state
      expect(screen.getByText(/No conversations yet/)).toBeInTheDocument();

      // Chat area welcome message
      expect(screen.getByText(/Welcome to Developer Agent/)).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should integrate sidebar and chat interface', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const sidebar = container.querySelector('.sidebar');
      const chatInterface = container.querySelector('.chat-interface');

      expect(sidebar).toBeInTheDocument();
      expect(chatInterface).toBeInTheDocument();
    });

    it('should integrate footer with main app', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const footer = container.querySelector('.app-footer');
      const app = container.querySelector('.app');

      expect(app).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
    });

    it('should show proper nesting of components', async () => {
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // App should contain everything
      const app = container.querySelector('.app');
      expect(app).toBeInTheDocument();

      // Sidebar should be within app
      const sidebar = app?.querySelector('.sidebar');
      expect(sidebar).toBeInTheDocument();

      // Chat interface should be within app
      const chatInterface = app?.querySelector('.chat-interface');
      expect(chatInterface).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('should initialize WebSocket on mount', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // Socket should be initialized with event listeners
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should use WebSocket context in app', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // WebSocketProvider wraps the app, so socket should be initialized
      expect(mockSocket.on).toHaveBeenCalled();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap app in error boundary', async () => {
      // Error boundary is at the root, so any errors should be caught
      const { container } = render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // App should render normally
      expect(container.querySelector('.app')).toBeInTheDocument();

      // No error UI should be visible
      expect(screen.queryByText('🚫 Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate headings', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('🤖 Developer Agent')).toBeInTheDocument();
      expect(screen.getByText('👋 Welcome to Developer Agent')).toBeInTheDocument();
    });

    it('should have input labels/placeholders', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByPlaceholderText('🔍 Search conversations...')).toBeInTheDocument();
    });

    it('should have clickable buttons', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      const newChatButton = screen.getByText('+ New Chat');
      expect(newChatButton).toBeInTheDocument();
      expect(newChatButton.tagName).toBe('BUTTON');

      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton.tagName).toBe('BUTTON');
    });
  });

  describe('Content Display', () => {
    it('should display helpful empty states', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      // Welcome message
      expect(screen.getByText(/Welcome to Developer Agent/)).toBeInTheDocument();

      // Instructions
      expect(screen.getByText(/Select a conversation from the sidebar/)).toBeInTheDocument();
    });

    it('should show user information in footer', async () => {
      render(<App />);
      await waitFor(() => expect(axios.get).toHaveBeenCalled());

      expect(screen.getByText('👤 testuser')).toBeInTheDocument();
    });
  });
});
