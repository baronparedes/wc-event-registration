import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMembersPage } from '@/pages/admin/members';

const {
  mockUseAdminMembersQuery,
  mockGetCurrentPageFromCursor,
  mockGetPageCursor,
  mockPaginationProps,
} = vi.hoisted(() => ({
  mockUseAdminMembersQuery: vi.fn(),
  mockGetCurrentPageFromCursor: vi.fn(),
  mockGetPageCursor: vi.fn(),
  mockPaginationProps: vi.fn(),
}));

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

vi.mock('@/pages/admin/members/components/AddMemberDialog', () => ({
  AddMemberDialog: () => <div>Add Member Dialog</div>,
}));

vi.mock('@/pages/admin/members/components/UpdateMemberIdDialog', () => ({
  UpdateMemberIdDialog: () => <div>Update Member ID Dialog</div>,
}));

describe('AdminMembersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentPageFromCursor.mockReturnValue(1);
    mockGetPageCursor.mockReturnValue(null);
  });

  it('renders members table rows from query data', () => {
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'user-1',
            member_id: 'WC-001',
            full_name: 'Jane Doe',
            nickname: 'J',
            email: 'jane@example.com',
            phone: '123',
            role: 'player',
            category: 'adult',
            created_at: '2026-06-27T00:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
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
    expect(screen.getByText('Update Member ID Dialog')).toBeInTheDocument();
  });

  it('renders empty-state text when no members are returned', () => {
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        items: [],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
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
        items: [],
        hasMore: false,
        nextCursor: null,
        totalPages: 1,
      },
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

  it('calls pagination handlers and cursor helpers', () => {
    mockGetCurrentPageFromCursor.mockReturnValue(2);
    mockGetPageCursor.mockImplementation((page: number) => `cursor-${page}`);
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        items: [
          {
            id: 'user-1',
            member_id: 'WC-001',
            full_name: 'Jane Doe',
            nickname: null,
            email: null,
            phone: null,
            role: null,
            category: null,
            created_at: '2026-06-27T00:00:00.000Z',
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
        <AdminMembersPage />
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
});
