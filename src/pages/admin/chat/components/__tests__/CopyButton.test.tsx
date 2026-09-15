import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CopyButton } from '../CopyButton';

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Use Object.defineProperty to bypass getter issues
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders correctly', () => {
    render(<CopyButton content="Test content" />);
    const button = screen.getByRole('button', { name: /copy response/i });
    expect(button).toBeInTheDocument();
  });

  it('copies content to clipboard and shows checkmark temporarily', async () => {
    const { container } = render(<CopyButton content="Hello world" />);
    const button = screen.getByRole('button', { name: /copy response/i });

    // Check initial icon (Copy)
    expect(container.querySelector('.lucide-copy')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello world');

    // Check icon changes to Check
    expect(container.querySelector('.lucide-check')).toBeInTheDocument();
    expect(container.querySelector('.lucide-copy')).not.toBeInTheDocument();

    // Advance timer to revert back
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Check icon reverted
    expect(container.querySelector('.lucide-copy')).toBeInTheDocument();
    expect(container.querySelector('.lucide-check')).not.toBeInTheDocument();
  });

  it('does nothing when content is empty', async () => {
    render(<CopyButton content="" />);
    const button = screen.getByRole('button', { name: /copy response/i });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
