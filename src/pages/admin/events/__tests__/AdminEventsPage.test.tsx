import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminEventsPage } from '@/pages/admin/events';

const {
  mockUseAdminEventsQuery,
  mockUseAdminAuthQuery,
  mockGetCurrentPageFromCursor,
  mockGetPageCursor,
  mockPaginationProps,
} = vi.hoisted(() => ({
  mockUseAdminEventsQuery: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockGetCurrentPageFromCursor: vi.fn(),
  mockGetPageCursor: vi.fn(),
  mockPaginationProps: vi.fn(),
}));

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

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    formatDateOnly: vi.fn(() => '2026-07-01'),
    getCurrentPageFromCursor: (...args: unknown[]) => mockGetCurrentPageFromCursor(...args),
    getPageCursor: (...args: unknown[]) => mockGetPageCursor(...args),
  };
});

vi.mock('@/components/ui/AdminPaginationControls', () => ({
  AdminPaginationControls: (props: {
    onFirstPage: () => void;
    onPreviousPage: () => void;
    onNextPage: () => void;
    onLastPage: () => void;
    onGoToPage: (page: number) => void;
    onPageSizeChange: (size: number) => void;
  }) => {
    mockPaginationProps(props);
    return (
      <div>
        <button onClick={props.onFirstPage} type="button">
          First
        </button>
        <button onClick={props.onPreviousPage} type="button">
          Previous
        </button>
        <button onClick={props.onNextPage} type="button">
          Next
        </button>
        <button onClick={props.onLastPage} type="button">
          Last
        </button>
        <button onClick={() => props.onGoToPage(3)} type="button">
          Go Page 3
        </button>
        <button onClick={() => props.onPageSizeChange(50)} type="button">
          Page Size 50
        </button>
      </div>
    );
  },
}));

vi.mock('@/pages/admin/events/components', () => ({
  EventStatusBadge: (props: { status: string }) => <div>{props.status}</div>,
  DuplicatePolicyLabel: (props: { policy: string }) => <div>{props.policy}</div>,
}));

describe('AdminEventsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'admin' },
      isLoading: false,
    });
    mockGetCurrentPageFromCursor.mockReturnValue(1);
    mockGetPageCursor.mockReturnValue(null);
    mockUseAdminEventsQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'event-1',
            title: 'Sample Event',
            slug: 'sample-event',
            status: 'draft',
            duplicate_policy: 'block',
            registration_mode: 'open',
            starts_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    });
  });

  it('renders event rows without publish/archive actions', () => {
    render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Sample Event')).toBeInTheDocument();
    expect(screen.getByText('sample-event')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('renders loading, error, and empty states', () => {
    mockUseAdminEventsQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { rerender } = render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading events...')).toBeInTheDocument();

    mockUseAdminEventsQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    rerender(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Failed to load events. Please refresh.')).toBeInTheDocument();

    mockUseAdminEventsQuery.mockReturnValueOnce({
      data: {
        items: [],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    });

    rerender(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No events yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create Event' })).toBeInTheDocument();
  });

  it('wires pagination handlers to cursor helper functions', () => {
    mockGetCurrentPageFromCursor.mockReturnValue(2);
    mockGetPageCursor.mockImplementation((page: number) => `cursor-${page}`);
    mockUseAdminEventsQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'event-1',
            title: 'Sample Event',
            slug: 'sample-event',
            status: 'published',
            duplicate_policy: 'block',
            registration_mode: 'open',
            starts_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        hasMore: true,
        nextCursor: 'cursor-next',
        totalPages: 4,
      },
      isLoading: false,
      error: null,
    });

    render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'First' }));
    fireEvent.click(screen.getByRole('button', { name: 'Last' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go Page 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Page Size 50' }));

    expect(mockGetPageCursor).toHaveBeenCalledWith(1, expect.any(Number));
    expect(mockGetPageCursor).toHaveBeenCalledWith(4, expect.any(Number));
    expect(mockGetPageCursor).toHaveBeenCalledWith(3, expect.any(Number));
  });

  it('renders search controls and passes search term to events query', async () => {
    render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText('Search by event title or slug');
    fireEvent.change(searchInput, { target: { value: 'sample' } });

    await waitFor(() => {
      expect(mockUseAdminEventsQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({ searchTerm: 'sample' }),
      );
    });
  });

  it('keeps clear disabled when search is empty and resets search when clicked', async () => {
    render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

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

  it('does not advance page when next cursor is missing', () => {
    render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

    const beforeCalls = mockUseAdminEventsQuery.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(mockUseAdminEventsQuery.mock.calls.length).toBe(beforeCalls);
  });

  it('hides write controls for slod users while keeping read navigation', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'slod' },
      isLoading: false,
    });

    render(
      <MemoryRouter>
        <AdminEventsPage />
      </MemoryRouter>,
    );

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
