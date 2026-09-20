import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makeMemberEventHistoryItem } from '@/__tests__/factories';

import { EventHistoryTab } from '../EventHistoryTab';

const { mockUseMemberEventHistoryQuery } = vi.hoisted(() => ({
  mockUseMemberEventHistoryQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useMemberEventHistoryQuery: (...args: unknown[]) => mockUseMemberEventHistoryQuery(...args),
  };
});

describe('EventHistoryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<EventHistoryTab memberId="user-123" />);

    expect(screen.getByText('Loading event history...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<EventHistoryTab memberId="user-123" />);

    expect(screen.getByText('Failed to load event history.')).toBeInTheDocument();
  });

  it('renders empty state when no events exist', () => {
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<EventHistoryTab memberId="user-123" />);

    expect(screen.getByText('No events found.')).toBeInTheDocument();
    expect(screen.getByText('Event History (0)')).toBeInTheDocument();
  });

  it('renders single event card when registration count is 1', () => {
    const item = makeMemberEventHistoryItem({
      event_id: 'ev-1',
      event_title: 'Singles Conference',
    });
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: [item],
      isLoading: false,
      isError: false,
    });

    render(<EventHistoryTab memberId="user-123" />);

    expect(screen.getByText('Singles Conference')).toBeInTheDocument();
    expect(screen.getByText('Event History (1)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View' })).not.toBeInTheDocument();
  });

  it('renders event group card and opens/closes modal when registrations > 1', async () => {
    const items = [
      makeMemberEventHistoryItem({
        event_id: 'multi-ev',
        event_title: 'Camp Retreat',
      }),
      makeMemberEventHistoryItem({
        event_id: 'multi-ev',
        event_title: 'Camp Retreat',
      }),
    ];
    mockUseMemberEventHistoryQuery.mockReturnValue({
      data: items,
      isLoading: false,
      isError: false,
    });

    render(<EventHistoryTab memberId="user-123" />);

    expect(screen.getByText('Event History (1)')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Camp Retreat' }),
    ).not.toBeInTheDocument();

    const viewButton = screen.getByRole('button', { name: 'View' });
    fireEvent.click(viewButton);

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Camp Retreat' }),
    ).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(
      screen.queryByRole('heading', { level: 2, name: 'Camp Retreat' }),
    ).not.toBeInTheDocument();
  });
});
