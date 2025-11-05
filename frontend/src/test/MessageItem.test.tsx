import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessageItem from '../components/MessageItem';
import { Message } from '../context/ChatContext';

describe('MessageItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const userMessage: Message = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, this is a test message',
    agentType: null,
    metadata: {},
    createdAt: new Date('2024-01-01T12:00:00Z').toISOString(),
  };

  const assistantMessage: Message = {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hello! I can help you with that.',
    agentType: 'developer',
    metadata: {},
    createdAt: new Date('2024-01-01T12:00:10Z').toISOString(),
  };

  describe('Rendering', () => {
    it('should render user message correctly', () => {
      render(<MessageItem message={userMessage} />);

      expect(screen.getByText('👤 You')).toBeInTheDocument();
      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
    });

    it('should render assistant message correctly', () => {
      render(<MessageItem message={assistantMessage} />);

      expect(screen.getByText('🤖 Agent')).toBeInTheDocument();
      expect(screen.getByText('Hello! I can help you with that.')).toBeInTheDocument();
    });

    it('should display agent type badge for assistant messages', () => {
      render(<MessageItem message={assistantMessage} />);

      expect(screen.getByText('developer')).toBeInTheDocument();
    });

    it('should not display agent type badge for user messages', () => {
      render(<MessageItem message={userMessage} />);

      expect(screen.queryByText('developer')).not.toBeInTheDocument();
    });

    it('should display timestamp', () => {
      render(<MessageItem message={userMessage} />);

      // Check that some time format is displayed
      const timestamp = screen.getByText(/\d{1,2}:\d{2}/);
      expect(timestamp).toBeInTheDocument();
    });

    it('should apply correct CSS class for user message', () => {
      const { container } = render(<MessageItem message={userMessage} />);

      const messageDiv = container.querySelector('.message');
      expect(messageDiv).toHaveClass('user-message');
    });

    it('should apply correct CSS class for assistant message', () => {
      const { container } = render(<MessageItem message={assistantMessage} />);

      const messageDiv = container.querySelector('.message');
      expect(messageDiv).toHaveClass('assistant-message');
    });
  });

  describe('Copy functionality', () => {
    it('should show copy button for messages', async () => {
      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      expect(copyButton).toBeInTheDocument();
    });

    it('should show "Copied!" feedback after copying', async () => {
      const user = userEvent.setup();
      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('✅ Copied')).toBeInTheDocument();
      });
    });

    it.skip('should reset copy feedback after 2 seconds', async () => {
      vi.useFakeTimers();
      const user = userEvent.setup({ delay: null });

      render(<MessageItem message={userMessage} />);

      const copyButton = screen.getByTitle('Copy message');
      await user.click(copyButton);

      expect(screen.getByText('✅ Copied')).toBeInTheDocument();

      vi.advanceTimersByTime(2000);

      expect(screen.queryByText('✅ Copied')).not.toBeInTheDocument();
      expect(screen.getByText('📋 Copy')).toBeInTheDocument();

      vi.useRealTimers();
    });
  });

  describe('Markdown rendering', () => {
    it('should render markdown content', () => {
      const markdownMessage: Message = {
        ...userMessage,
        content: '**Bold text** and *italic text*',
      };

      render(<MessageItem message={markdownMessage} />);

      const bold = screen.getByText('Bold text');
      expect(bold.tagName).toBe('STRONG');

      const italic = screen.getByText('italic text');
      expect(italic.tagName).toBe('EM');
    });

    it('should render inline code', () => {
      const codeMessage: Message = {
        ...userMessage,
        content: 'Use `console.log()` to debug',
      };

      render(<MessageItem message={codeMessage} />);

      const code = screen.getByText('console.log()');
      expect(code.tagName).toBe('CODE');
      expect(code).toHaveClass('inline-code');
    });

    it('should render code blocks with language', () => {
      const codeBlockMessage: Message = {
        ...userMessage,
        content: '```javascript\nconst x = 1;\n```',
      };

      const { container } = render(<MessageItem message={codeBlockMessage} />);

      expect(screen.getByText('javascript')).toBeInTheDocument();
      const copyButtons = screen.getAllByText('📋 Copy');
      expect(copyButtons.length).toBeGreaterThan(0);
      expect(container.querySelector('.code-block-wrapper')).toBeInTheDocument();
    });

    it('should show copy button for code blocks', async () => {
      const codeBlockMessage: Message = {
        ...userMessage,
        content: '```javascript\nconst x = 1;\n```',
      };

      render(<MessageItem message={codeBlockMessage} />);

      const copyCodeButton = screen.getByTitle('Copy code');
      expect(copyCodeButton).toBeInTheDocument();
    });

    it('should render lists', () => {
      const listMessage: Message = {
        ...userMessage,
        content: '- Item 1\n- Item 2\n- Item 3',
      };

      const { container } = render(<MessageItem message={listMessage} />);

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();

      const items = container.querySelectorAll('li');
      expect(items.length).toBe(3);
    });

    it('should render links', () => {
      const linkMessage: Message = {
        ...userMessage,
        content: '[GitHub](https://github.com)',
      };

      render(<MessageItem message={linkMessage} />);

      const link = screen.getByRole('link', { name: 'GitHub' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://github.com');
    });
  });
});
