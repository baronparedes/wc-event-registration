import { faker } from '@faker-js/faker';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPublicRegistrationsPage } from '@/pages/admin/events/[id]/public-registrations';

const {
  mockUseParams,
  mockNavigate,
  mockUseAdminAuthQuery,
  mockUseAdminEventQuery,
  mockUseAdminPublicRegistrationsQuery,
  mockUseDownloadPublicRegistrationsTemplateMutation,
} = vi.hoisted(() => ({
  mockUseParams: vi.fn(),
  mockNavigate: vi.fn(),
  mockUseAdminAuthQuery: vi.fn(),
  mockUseAdminEventQuery: vi.fn(),
  mockUseAdminPublicRegistrationsQuery: vi.fn(),
  mockUseDownloadPublicRegistrationsTemplateMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');
  return {
    ...actual,
    useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/domain/events', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/events')>('@/hooks/domain/events');
  return {
    ...actual,
    useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
  };
});

vi.mock('@/hooks/domain/public-registrations', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/public-registrations')>(
    '@/hooks/domain/public-registrations',
  );
  return {
    ...actual,
    useAdminPublicRegistrationsQuery: (...args: unknown[]) =>
      mockUseAdminPublicRegistrationsQuery(...args),
    useDownloadPublicRegistrationsTemplateMutation: (...args: unknown[]) =>
      mockUseDownloadPublicRegistrationsTemplateMutation(...args),
  };
});

vi.mock('@/pages/admin/events/[id]/registrations/components', () => ({
  PublicRegistrationsList: (props: {
    registrations: Array<{ email: string }>;
    canWrite?: boolean;
  }) => (
    <div>{`Public registrations: ${props.registrations.map((registration) => registration.email).join(', ')}:${props.canWrite ? 'write' : 'read'}`}</div>
  ),
}));

describe('AdminPublicRegistrationsPage', () => {
  let testEventId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    testEventId = faker.string.uuid();
    mockUseParams.mockReturnValue({ id: testEventId });
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'admin' },
      isLoading: false,
    });
    mockUseDownloadPublicRegistrationsTemplateMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  function renderWithRouter() {
    return render(
      <MemoryRouter>
        <AdminPublicRegistrationsPage />
      </MemoryRouter>,
    );
  }

  it('renders registrations and published-state banner', () => {
    const eventTitle = faker.lorem.words(2);
    const attendeeEmail = faker.internet.email();

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    });
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [{ email: attendeeEmail }],
            hasMore: false,
            nextCursor: null,
            totalCount: 1,
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

    renderWithRouter();

    expect(screen.getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/admin/events');
    expect(screen.getByRole('link', { name: eventTitle })).toHaveAttribute(
      'href',
      `/admin/events/${testEventId}`,
    );
    expect(
      screen.getByRole('heading', { level: 1, name: 'Manage Public Registrations' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('This event is published. All public registrations are visible.'),
    ).toBeInTheDocument();
    expect(screen.getByText(`Public registrations: ${attendeeEmail}:write`)).toBeInTheDocument();
    expect(screen.getByText('Showing all 1 public registration')).toBeInTheDocument();
  });

  it('renders error state when queries fail', () => {
    const errorMessage = faker.lorem.words(2);

    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error(errorMessage),
    });
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderWithRouter();

    expect(screen.getByText('Manage Public Registrations')).toBeInTheDocument();
    expect(screen.getByText(/Error loading public registrations:/)).toBeInTheDocument();
  });

  it('renders invalid event id state', () => {
    mockUseParams.mockReturnValue({});
    mockUseAdminEventQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderWithRouter();

    expect(screen.getByText('Invalid event ID')).toBeInTheDocument();
  });

  it('renders mobile-stacked header actions and navigates to member registrations', () => {
    const eventTitle = faker.lorem.words(2);

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    });
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [],
            hasMore: false,
            nextCursor: null,
            totalCount: 0,
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

    renderWithRouter();

    const memberRegistrationsButton = screen.getByRole('button', {
      name: 'View Member Registrations',
    });
    const headerActionsContainer = memberRegistrationsButton.parentElement;

    expect(headerActionsContainer).toHaveClass('w-full');
    expect(headerActionsContainer).toHaveClass('flex-col');
    expect(headerActionsContainer).toHaveClass('gap-2');

    fireEvent.click(memberRegistrationsButton);
    expect(mockNavigate).toHaveBeenCalledWith(`/admin/events/${testEventId}/registrations`);
  });

  it('enables clear button after debounced search and clears input', () => {
    vi.useFakeTimers();
    const eventTitle = faker.lorem.words(2);
    const searchTerm = faker.person.firstName();

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    });
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [],
            hasMore: false,
            nextCursor: null,
            totalCount: 0,
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

    renderWithRouter();

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    expect(clearButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Search by name or email/i), {
      target: { value: searchTerm },
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(clearButton).toBeEnabled();
    fireEvent.click(clearButton);
    expect(
      (screen.getByPlaceholderText(/Search by name or email/i) as HTMLInputElement).value,
    ).toBe('');

    vi.useRealTimers();
  });

  it('renders load more button when hasNextPage is true and calls fetchNextPage when clicked', () => {
    const eventTitle = faker.lorem.words(2);
    const fetchNextPage = vi.fn();

    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: eventTitle, status: 'published' },
      isLoading: false,
      error: null,
    });
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [{ email: 'guest@example.com' }],
            hasMore: true,
            nextCursor: '25',
            totalCount: 50,
            totalPages: 2,
          },
        ],
      },
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
      isLoading: false,
      error: null,
    });

    renderWithRouter();

    expect(screen.getByText('Showing 1 of 50 public registrations')).toBeInTheDocument();
    const loadMoreButton = screen.getByRole('button', { name: 'Load More' });
    expect(loadMoreButton).toBeInTheDocument();
    fireEvent.click(loadMoreButton);
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('passes read-only mode to the list for slod users', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'slod' },
      isLoading: false,
    });
    mockUseAdminEventQuery.mockReturnValue({
      data: { id: testEventId, title: 'Event', status: 'published' },
      isLoading: false,
      error: null,
    });
    mockUseAdminPublicRegistrationsQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [{ email: 'guest@example.com' }],
            hasMore: false,
            nextCursor: null,
            totalCount: 1,
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

    renderWithRouter();

    expect(screen.getByText('Public registrations: guest@example.com:read')).toBeInTheDocument();
  });
});
