import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TypingIndicator from '../components/TypingIndicator';

describe('TypingIndicator', () => {
  it('should render typing indicator', () => {
    render(<TypingIndicator />);

    expect(screen.getByText('Agent is thinking...')).toBeInTheDocument();
  });

  it('should render three dots', () => {
    const { container } = render(<TypingIndicator />);

    const dots = container.querySelectorAll('.typing-dot');
    expect(dots.length).toBe(3);
  });

  it('should have correct CSS classes', () => {
    const { container } = render(<TypingIndicator />);

    expect(container.querySelector('.typing-indicator')).toBeInTheDocument();
    expect(container.querySelector('.typing-indicator-content')).toBeInTheDocument();
  });
});
