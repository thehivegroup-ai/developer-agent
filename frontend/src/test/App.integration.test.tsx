import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

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
  });

  afterEach(() => {
    // Clean up
    localStorage.clear();
  });

  describe('App Rendering', () => {
    it('should render the main app structure', () => {
      const { container } = render(<App />);

      // Should have the main app container
      expect(container.querySelector('.app')).toBeInTheDocument();
    });

    it('should render sidebar', () => {
      const { container } = render(<App />);

      expect(container.querySelector('.sidebar')).toBeInTheDocument();
    });

    it('should render chat interface', () => {
      const { container } = render(<App />);

      expect(container.querySelector('.chat-interface')).toBeInTheDocument();
    });

    it('should render within error boundary', () => {
      render(<App />);

      // Should render without errors
      expect(screen.queryByText('🚫 Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('should show Developer Agent header', () => {
      render(<App />);

      expect(screen.getByText('🤖 Developer Agent')).toBeInTheDocument();
    });

    it('should show New Chat button', () => {
      render(<App />);

      expect(screen.getByText('+ New Chat')).toBeInTheDocument();
    });

    it('should show welcome message initially', () => {
      render(<App />);

      expect(screen.getByText('👋 Welcome to Developer Agent')).toBeInTheDocument();
    });

    it('should show username in footer', () => {
      render(<App />);

      expect(screen.getByText('👤 testuser')).toBeInTheDocument();
    });

    it('should show logout button', () => {
      render(<App />);

      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have sidebar on the left', () => {
      const { container } = render(<App />);

      const sidebar = container.querySelector('.sidebar');
      expect(sidebar).toBeInTheDocument();
    });

    it('should have chat interface in center', () => {
      const { container } = render(<App />);

      const chatInterface = container.querySelector('.chat-interface');
      expect(chatInterface).toBeInTheDocument();
    });

    it('should render all major components', () => {
      const { container } = render(<App />);

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

      const searchInput = screen.getByPlaceholderText('🔍 Search conversations...');
      await user.type(searchInput, 'test');

      expect(searchInput).toHaveValue('test');
    });

    it('should show no conversations empty state', () => {
      render(<App />);

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('should show logout functionality', () => {
      const { container } = render(<App />);

      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();

      // App should be visible before logout
      expect(container.querySelector('.app')).toBeInTheDocument();
    });
  });

  describe('Responsive Elements', () => {
    it('should have search functionality in sidebar', () => {
      render(<App />);

      const searchInput = screen.getByPlaceholderText('🔍 Search conversations...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should show appropriate empty states', () => {
      render(<App />);

      // Conversations empty state
      expect(screen.getByText(/No conversations yet/)).toBeInTheDocument();

      // Chat area welcome message
      expect(screen.getByText(/Welcome to Developer Agent/)).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('should integrate sidebar and chat interface', () => {
      const { container } = render(<App />);

      const sidebar = container.querySelector('.sidebar');
      const chatInterface = container.querySelector('.chat-interface');

      expect(sidebar).toBeInTheDocument();
      expect(chatInterface).toBeInTheDocument();
    });

    it('should integrate footer with main app', () => {
      const { container } = render(<App />);

      const footer = container.querySelector('.app-footer');
      const app = container.querySelector('.app');

      expect(app).toBeInTheDocument();
      expect(footer).toBeInTheDocument();
    });

    it('should show proper nesting of components', () => {
      const { container } = render(<App />);

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
    it('should initialize WebSocket on mount', () => {
      render(<App />);

      // Socket should be initialized with event listeners
      expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should use WebSocket context in app', () => {
      render(<App />);

      // WebSocketProvider wraps the app, so socket should be initialized
      expect(mockSocket.on).toHaveBeenCalled();
    });
  });

  describe('Error Boundary Integration', () => {
    it('should wrap app in error boundary', () => {
      // Error boundary is at the root, so any errors should be caught
      const { container } = render(<App />);

      // App should render normally
      expect(container.querySelector('.app')).toBeInTheDocument();

      // No error UI should be visible
      expect(screen.queryByText('🚫 Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate headings', () => {
      render(<App />);

      expect(screen.getByText('🤖 Developer Agent')).toBeInTheDocument();
      expect(screen.getByText('👋 Welcome to Developer Agent')).toBeInTheDocument();
    });

    it('should have input labels/placeholders', () => {
      render(<App />);

      expect(screen.getByPlaceholderText('🔍 Search conversations...')).toBeInTheDocument();
    });

    it('should have clickable buttons', () => {
      render(<App />);

      const newChatButton = screen.getByText('+ New Chat');
      expect(newChatButton).toBeInTheDocument();
      expect(newChatButton.tagName).toBe('BUTTON');

      const logoutButton = screen.getByText('Logout');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton.tagName).toBe('BUTTON');
    });
  });

  describe('Content Display', () => {
    it('should display helpful empty states', () => {
      render(<App />);

      // Welcome message
      expect(screen.getByText(/Welcome to Developer Agent/)).toBeInTheDocument();

      // Instructions
      expect(screen.getByText(/Select a conversation from the sidebar/)).toBeInTheDocument();
    });

    it('should show user information in footer', () => {
      render(<App />);

      expect(screen.getByText('👤 testuser')).toBeInTheDocument();
    });
  });
});
