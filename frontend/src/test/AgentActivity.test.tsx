import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentActivity from '../components/AgentActivity';
import type { AgentActivity as Activity } from '../context/WebSocketContext';

// Mock WebSocket context
const mockClearActivities = vi.fn();
const mockUseWebSocket = vi.fn();

vi.mock('../context/WebSocketContext', () => ({
  useWebSocket: () => mockUseWebSocket(),
}));

describe('AgentActivity', () => {
  const mockActivities: Activity[] = [
    {
      id: '1',
      type: 'agent:spawned',
      data: { agentId: 'agent-123456789', agentType: 'developer' },
      timestamp: new Date('2024-01-01T10:00:00Z').toISOString(),
    },
    {
      id: '2',
      type: 'agent:status',
      data: { agentId: 'agent-123456789', status: 'working' },
      timestamp: new Date('2024-01-01T10:00:05Z').toISOString(),
    },
    {
      id: '3',
      type: 'query:progress',
      data: { progress: 75, message: 'Processing request...' },
      timestamp: new Date('2024-01-01T10:00:10Z').toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWebSocket.mockReturnValue({
      activities: [],
      connected: false,
      clearActivities: mockClearActivities,
      sendMessage: vi.fn(),
    });
  });

  describe('Header', () => {
    it('should render header with title', () => {
      render(<AgentActivity />);
      expect(screen.getByText('🤖 Agent Activity')).toBeInTheDocument();
    });

    it('should show connected status when connected', () => {
      mockUseWebSocket.mockReturnValue({
        activities: [],
        connected: true,
        clearActivities: mockClearActivities,
        sendMessage: vi.fn(),
      });

      render(<AgentActivity />);
      expect(screen.getByText('🟢 Live')).toBeInTheDocument();
    });

    it('should show disconnected status when not connected', () => {
      mockUseWebSocket.mockReturnValue({
        activities: [],
        connected: false,
        clearActivities: mockClearActivities,
        sendMessage: vi.fn(),
      });

      render(<AgentActivity />);
      expect(screen.getByText('🔴 Offline')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should show empty state when no activities', () => {
      render(<AgentActivity />);

      expect(screen.getByText('No activity yet')).toBeInTheDocument();
      expect(screen.getByText('Agent events will appear here in real-time')).toBeInTheDocument();
    });

    it('should not show clear button when empty', () => {
      render(<AgentActivity />);

      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  describe('Activity rendering', () => {
    beforeEach(() => {
      mockUseWebSocket.mockReturnValue({
        activities: mockActivities,
        connected: true,
        clearActivities: mockClearActivities,
        sendMessage: vi.fn(),
      });
    });

    it('should render all activities', () => {
      render(<AgentActivity />);

      expect(screen.getByText('agent › spawned')).toBeInTheDocument();
      expect(screen.getByText('agent › status')).toBeInTheDocument();
      expect(screen.getByText('query › progress')).toBeInTheDocument();
    });

    it('should show agent ID when present', () => {
      render(<AgentActivity />);

      const agentIds = screen.getAllByText('agent-12...');
      expect(agentIds.length).toBeGreaterThan(0);
    });

    it('should show agent type when present', () => {
      render(<AgentActivity />);

      expect(screen.getByText('developer')).toBeInTheDocument();
    });

    it('should show status when present', () => {
      render(<AgentActivity />);

      expect(screen.getByText('working')).toBeInTheDocument();
    });

    it('should show progress percentage when present', () => {
      render(<AgentActivity />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should show message when present', () => {
      render(<AgentActivity />);

      expect(screen.getByText('Processing request...')).toBeInTheDocument();
    });

    it('should show timestamps', () => {
      render(<AgentActivity />);

      // Timestamps will be in locale time format
      const timestamps = screen.getAllByText(/\d{1,2}:\d{2}:\d{2}/);
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('should show clear button when activities exist', () => {
      render(<AgentActivity />);

      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should not show empty state when activities exist', () => {
      render(<AgentActivity />);

      expect(screen.queryByText('No activity yet')).not.toBeInTheDocument();
    });
  });

  describe('Clear functionality', () => {
    it('should call clearActivities when Clear All is clicked', async () => {
      mockUseWebSocket.mockReturnValue({
        activities: mockActivities,
        connected: true,
        clearActivities: mockClearActivities,
        sendMessage: vi.fn(),
      });

      const user = userEvent.setup();
      render(<AgentActivity />);

      await user.click(screen.getByText('Clear All'));

      expect(mockClearActivities).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event icons and colors', () => {
    it('should display different icons for different event types', () => {
      const differentEvents: Activity[] = [
        {
          id: '1',
          type: 'agent:spawned',
          data: {},
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'task:created',
          data: {},
          timestamp: new Date().toISOString(),
        },
        {
          id: '3',
          type: 'error',
          data: { error: 'Something went wrong' },
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseWebSocket.mockReturnValue({
        activities: differentEvents,
        connected: true,
        clearActivities: mockClearActivities,
        sendMessage: vi.fn(),
      });

      const { container } = render(<AgentActivity />);

      const icons = container.querySelectorAll('.activity-icon');
      expect(icons).toHaveLength(3);
    });

    it('should display error messages', () => {
      const errorActivity: Activity[] = [
        {
          id: '1',
          type: 'error',
          data: { error: 'Connection failed' },
          timestamp: new Date().toISOString(),
        },
      ];

      mockUseWebSocket.mockReturnValue({
        activities: errorActivity,
        connected: false,
        clearActivities: mockClearActivities,
        sendMessage: vi.fn(),
      });

      render(<AgentActivity />);

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });
  });
});
