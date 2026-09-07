import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMembersPage } from '@/pages/admin/members';

const { mockUseAdminAuthQuery, mockUseAdminMembersQuery } = vi.hoisted(() => ({
  mockUseAdminAuthQuery: vi.fn(),
  mockUseAdminMembersQuery: vi.fn(),
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

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div>{name}</div>,
}));

vi.mock('@/hooks/domain/auth', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/domain/auth')>('@/hooks/domain/auth');
  return {
    ...actual,
    useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  };
});

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useAdminMembersQuery: (...args: unknown[]) => mockUseAdminMembersQuery(...args),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    formatDateOnly: vi.fn(() => '2026-06-27'),
  };
});

vi.mock('@/pages/admin/members/components/AddMemberDialog', () => ({
  AddMemberDialog: () => <div>Add Member Dialog</div>,
}));

vi.mock('@/pages/admin/members/components/UpdateMemberIdDialog', () => ({
  UpdateMemberIdDialog: () => <div>Update Member ID Dialog</div>,
}));

describe('AdminMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'admin' },
      isLoading: false,
    });
  });

  it('renders members table rows from query data and shows count summary', () => {
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: 'user-1',
                member_id: 'WC-001',
                is_active: true,
                full_name: 'Jane Doe',
                nickname: 'J',
                email: 'jane@example.com',
                phone: '123',
                role: 'player',
                category: 'adult',
                created_at: '2026-06-27T00:00:00.000Z',
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

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('WC-001')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('Showing all 1 member')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Milestones' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload CSV' })).toBeInTheDocument();
    expect(screen.getByText('Update Member ID Dialog')).toBeInTheDocument();
  });

  it('renders Load More button when hasNextPage is true and calls fetchNextPage when clicked', () => {
    const mockFetchNextPage = vi.fn();
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: 'user-1',
                member_id: 'WC-001',
                is_active: true,
                full_name: 'Jane Doe',
                nickname: 'J',
                email: 'jane@example.com',
                phone: '123',
                role: 'player',
                category: 'adult',
                created_at: '2026-06-27T00:00:00.000Z',
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

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Showing 1 of 50 members')).toBeInTheDocument();
    const loadMoreBtn = screen.getByRole('button', { name: 'Load More' });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('renders empty-state text when no members are returned', () => {
    mockUseAdminMembersQuery.mockReturnValue({
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

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('No members yet')).toBeInTheDocument();
    expect(
      screen.getByText('Members will appear here once they are added to the system'),
    ).toBeInTheDocument();
  });

  it('renders loading and error states', () => {
    mockUseAdminMembersQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { rerender } = render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading members...')).toBeInTheDocument();

    mockUseAdminMembersQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('failed'),
    });

    rerender(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Failed to load members. Please refresh.')).toBeInTheDocument();
  });

  it('shows search-specific empty state and allows clearing search', () => {
    vi.useFakeTimers();

    mockUseAdminMembersQuery.mockReturnValue({
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

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    expect(clearButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Search by first name/i), {
      target: { value: 'Jane' },
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(clearButton).toBeEnabled();
    fireEvent.click(clearButton);
    expect((screen.getByPlaceholderText(/Search by first name/i) as HTMLInputElement).value).toBe(
      '',
    );

    vi.useRealTimers();
  });

  it('allows filtering by deleted members', async () => {
    mockUseAdminMembersQuery.mockReturnValue({
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

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    const statusButton = screen.getByRole('button', { name: 'Status' });
    fireEvent.click(statusButton);
    const deletedOption = await screen.findByRole('option', { name: 'Deleted' });
    fireEvent.click(deletedOption);

    expect(mockUseAdminMembersQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({ statusFilter: 'deleted' }),
    );
  });

  it('shows read-only member access for slod users', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: true, session: null, adminRole: 'slod' },
      isLoading: false,
    });
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: 'user-1',
                member_id: 'WC-001',
                is_active: true,
                full_name: 'Jane Doe',
                nickname: null,
                email: 'jane@example.com',
                phone: null,
                role: 'player',
                category: 'adult',
                created_at: '2026-06-27T00:00:00.000Z',
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

    render(
      <MemoryRouter>
        <AdminMembersPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Upload CSV' })).not.toBeInTheDocument();
    expect(screen.queryByText('Add Member Dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Update Member ID Dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Member' })).toHaveAttribute(
      'href',
      '/admin/members/user-1',
    );
  });
});
