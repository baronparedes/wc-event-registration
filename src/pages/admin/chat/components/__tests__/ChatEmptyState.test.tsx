import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_HELPER_PROMPTS } from '@/pages/admin/chat/constants';

import { ChatEmptyState } from '../ChatEmptyState';

// Mock the BrandAvatar to simplify the test
vi.mock('@/components/ui', () => ({
  Badge: ({ children, ...props }: { children: React.ReactNode }) => (
    <span data-testid="badge" {...props}>
      {children}
    </span>
  ),
  BrandAvatar: (props: Record<string, unknown>) => <div data-testid="brand-avatar" {...props} />,
}));

describe('ChatEmptyState', () => {
  it('renders the initial greeting, beta badge, and helper text', () => {
    render(<ChatEmptyState />);

    expect(screen.getByTestId('brand-avatar')).toBeInTheDocument();
    expect(screen.getByText('Hi! Chat with Hub AI.')).toBeInTheDocument();
    expect(screen.getByTestId('badge')).toHaveTextContent('Beta');
    expect(
      screen.getByText('Ask me questions about volunteers, schedules, and events.'),
    ).toBeInTheDocument();
  });

  it('does not render helper prompts if onSelectPrompt is not provided', () => {
    render(<ChatEmptyState />);

    DEFAULT_HELPER_PROMPTS.forEach((prompt) => {
      expect(screen.queryByText(prompt.prompt)).not.toBeInTheDocument();
    });
  });

  it('renders helper prompts when onSelectPrompt is provided', () => {
    const mockOnSelectPrompt = vi.fn();
    render(<ChatEmptyState onSelectPrompt={mockOnSelectPrompt} />);

    DEFAULT_HELPER_PROMPTS.forEach((prompt) => {
      expect(screen.getByText(prompt.prompt)).toBeInTheDocument();
      expect(screen.getByText(prompt.icon)).toBeInTheDocument();
    });
  });

  it('calls onSelectPrompt with the correct prompt when a button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnSelectPrompt = vi.fn();
    render(<ChatEmptyState onSelectPrompt={mockOnSelectPrompt} />);

    const targetPrompt = DEFAULT_HELPER_PROMPTS[0];
    const button = screen.getByRole('button', { name: new RegExp(targetPrompt.prompt) });

    await user.click(button);

    expect(mockOnSelectPrompt).toHaveBeenCalledTimes(1);
    expect(mockOnSelectPrompt).toHaveBeenCalledWith(targetPrompt.prompt);
  });

  it('disables prompt buttons when the disabled prop is true', () => {
    const mockOnSelectPrompt = vi.fn();
    render(<ChatEmptyState onSelectPrompt={mockOnSelectPrompt} disabled />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });
});
