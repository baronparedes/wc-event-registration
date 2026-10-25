import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CsvFormatGuideCard } from '../CsvFormatGuideCard';

describe('CsvFormatGuideCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders collapsed by default and expands on click', () => {
    render(<CsvFormatGuideCard />);

    expect(screen.getByText('Show Guide')).toBeInTheDocument();
    expect(screen.queryByText('Mandatory Columns (Required on every row)')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /csv format guide & guidelines/i }));

    expect(screen.getByText('Hide Guide')).toBeInTheDocument();
    expect(screen.getByText('Mandatory Columns (Required on every row)')).toBeInTheDocument();
    expect(screen.getByText('Common Optional Columns')).toBeInTheDocument();
    expect(screen.getByText('Matching & Upsert Behavior')).toBeInTheDocument();
    expect(screen.getByText('Sample CSV Template')).toBeInTheDocument();

    // Toggle closed again
    fireEvent.click(screen.getByRole('button', { name: /csv format guide & guidelines/i }));
    expect(screen.getByText('Show Guide')).toBeInTheDocument();
    expect(screen.queryByText('Mandatory Columns (Required on every row)')).not.toBeInTheDocument();
  });

  it('copies sample template to clipboard and resets after timeout', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    render(<CsvFormatGuideCard />);
    fireEvent.click(screen.getByRole('button', { name: /csv format guide & guidelines/i }));

    const copyBtn = screen.getByRole('button', { name: /copy template/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    expect(writeTextMock).toHaveBeenCalledWith(
      expect.stringContaining('member_id,first_name,last_name'),
    );

    expect(screen.getByText('Copied!')).toBeInTheDocument();

    // Fast-forward 2000ms
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Copy Template')).toBeInTheDocument();
  });

  it('handles clipboard failure gracefully', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Clipboard denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    });

    render(<CsvFormatGuideCard />);
    fireEvent.click(screen.getByRole('button', { name: /csv format guide & guidelines/i }));

    const copyBtn = screen.getByRole('button', { name: /copy template/i });
    await act(async () => {
      expect(() => fireEvent.click(copyBtn)).not.toThrow();
    });
  });
});
