import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminEventsQuery } from '@/hooks/domain/events';

import { BroadcastEventPicker } from '../BroadcastEventPicker';

vi.mock('@/hooks/domain/events', () => ({
  useAdminEventsQuery: vi.fn(),
}));

describe('BroadcastEventPicker', () => {
  const mockEvent = {
    id: 'event-uuid-1234',
    title: 'Discipleship Retreat',
    slug: 'discipleship-retreat',
    status: 'published',
    starts_at: '2026-11-01T08:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdminEventsQuery).mockReturnValue({
      data: {
        pages: [
          {
            items: [mockEvent],
            hasMore: false,
            nextCursor: null,
            totalCount: 1,
            totalPages: 1,
          },
        ],
      },
      isLoading: false,
    } as never);
  });

  it('renders event picker and allows selecting an event', () => {
    const handleChange = vi.fn();
    render(<BroadcastEventPicker onChange={handleChange} />);

    expect(screen.getByText('Target Event')).toBeInTheDocument();
    const trigger = screen.getByText('Select an event...');
    expect(trigger).toBeInTheDocument();

    // Open dropdown
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText('Search events by name...')).toBeInTheDocument();
    expect(screen.getByText('Discipleship Retreat')).toBeInTheDocument();

    // Select event
    fireEvent.click(screen.getByText('Discipleship Retreat'));
    expect(handleChange).toHaveBeenCalledWith('event-uuid-1234', mockEvent);
  });

  it('displays selected event info when value is provided', () => {
    render(<BroadcastEventPicker value="event-uuid-1234" onChange={vi.fn()} />);

    expect(screen.getByText('Discipleship Retreat')).toBeInTheDocument();
    expect(screen.getByText('(published)')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(<BroadcastEventPicker onChange={vi.fn()} error="Please select a target event" />);

    expect(screen.getByText('Please select a target event')).toBeInTheDocument();
  });
});
