import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminEventsPage } from '@/pages/admin/events';

const { mockUseAdminEventsQuery, mockUseAdminAuthQuery, mockUseDuplicateEventMutation } =
  vi.hoisted(() => ({
    mockUseAdminEventsQuery: vi.fn(),
    mockUseAdminAuthQuery: vi.fn(),
    mockUseDuplicateEventMutation: vi.fn(),
  }));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');
  return {
    ...actual,
    useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  };
});

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events');
  return {
    ...actual,
    useAdminEventsQuery: (...args: unknown[]) => mockUseAdminEventsQuery(...args),
  };
});

vi.mock('@/hooks/domain/events/mutations', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/events/mutations')>(
    '@/hooks/domain/events/mutations',
  );
  return {
    ...actual,
    useDuplicateEventMutation: (...args: unknown[]) => mockUseDuplicateEventMutation(...args),
  };
});

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/utils')>('@/hooks/utils');
  return {
    ...actual,
    useIsMobileViewport: () => false,
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    formatDateOnly: vi.fn(() => '2026-07-01'),
  };
});

vi.mock('@/pages/admin/events/components', async () => {
  const actual = await vi.importActual<typeof import('@/pages/admin/events/components')>(
    '@/pages/admin/events/components',
  );

  return {
    ...actual,
    EventStatusBadge: (props: { status: string }) => <div>{props.status}</div>,
    DuplicatePolicyLabel: (props: { policy: string }) => <div>{props.policy}</div>,
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function wrapWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminEventsPage', () => {
  beforeEach(() => {
    queryClient.clear();
    vi.clearAllMocks();
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'admin' },
      isLoading: false,
    });
    mockUseAdminEventsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: 'event-1',
                title: 'Sample Event',
                slug: 'sample-event',
                location: 'Main Hall',
                status: 'draft',
                duplicate_policy: 'block',
                registration_mode: 'open',
                starts_at: '2026-07-01T00:00:00.000Z',
              },
            ],
            totalCount: 1,
            hasMore: false,
            nextCursor: null,
            totalPages: 1,
          },
        ],
      },
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });
    mockUseDuplicateEventMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders event rows without publish/archive actions and displays total count', () => {
    wrapWithProviders(<AdminEventsPage />);

    expect(screen.getByText('Sample Event')).toBeInTheDocument();
    expect(screen.getByText('sample-event')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByText('Main Hall')).toBeInTheDocument();
    expect(screen.getByText('Showing all 1 event')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('renders Load More button when hasNextPage is true and calls fetchNextPage', () => {
    const mockFetchNextPage = vi.fn();
    mockUseAdminEventsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: 'event-1',
                title: 'Sample Event',
                slug: 'sample-event',
                location: 'Main Hall',
                status: 'draft',
                duplicate_policy: 'block',
                registration_mode: 'open',
                starts_at: '2026-07-01T00:00:00.000Z',
              },
            ],
            totalCount: 50,
            hasMore: true,
            nextCursor: '50',
            totalPages: 2,
          },
        ],
      },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isLoading: false,
      error: null,
    });

    wrapWithProviders(<AdminEventsPage />);

    expect(screen.getByText('Showing 1 of 50 events')).toBeInTheDocument();
    const loadMoreBtn = screen.getByRole('button', { name: 'Load More' });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('renders loading, error, and empty states', () => {
    mockUseAdminEventsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { unmount: unmount1 } = wrapWithProviders(<AdminEventsPage />);

    expect(screen.getByText('Loading events...')).toBeInTheDocument();

    unmount1();

    mockUseAdminEventsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    const { unmount: unmount2 } = wrapWithProviders(<AdminEventsPage />);

    expect(screen.getByText('Failed to load events. Please refresh.')).toBeInTheDocument();

    unmount2();

    mockUseAdminEventsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [],
            totalCount: 0,
            hasMore: false,
            nextCursor: null,
            totalPages: 0,
          },
        ],
      },
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    wrapWithProviders(<AdminEventsPage />);

    expect(screen.getByText('No events yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Event' })).toBeInTheDocument();
  });

  it('renders search controls and passes search term to events query', async () => {
    wrapWithProviders(<AdminEventsPage />);

    const searchInput = screen.getByPlaceholderText('Search by event title or slug');
    fireEvent.change(searchInput, { target: { value: 'sample' } });

    await waitFor(() => {
      expect(mockUseAdminEventsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchTerm: 'sample' }),
      );
    });
  });

  it('keeps clear disabled when search is empty and resets search when clicked', async () => {
    wrapWithProviders(<AdminEventsPage />);

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    expect(clearButton).toBeDisabled();

    const searchInput = screen.getByPlaceholderText('Search by event title or slug');
    fireEvent.change(searchInput, { target: { value: 'sample' } });

    await waitFor(() => {
      expect(clearButton).toBeEnabled();
    });

    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockUseAdminEventsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchTerm: '' }),
      );
    });
  });

  it('hides write controls for slod users while keeping read navigation', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'slod' },
      isLoading: false,
    });

    wrapWithProviders(<AdminEventsPage />);

    expect(screen.queryByRole('button', { name: 'New Event' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Fields' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Attendee Details' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/attendance/data',
    );
    expect(screen.getByRole('link', { name: 'Registrations' })).toHaveAttribute(
      'href',
      '/admin/events/event-1/registrations',
    );
  });
});
