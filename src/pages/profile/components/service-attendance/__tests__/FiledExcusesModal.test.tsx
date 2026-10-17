import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ServiceExcuseRequest } from '@/lib/domain/services';

import { FiledExcusesModal } from '../FiledExcusesModal';

const { mockUseMemberServiceExcusesQuery, mockUseCancelExcuseMutation } = vi.hoisted(() => ({
  mockUseMemberServiceExcusesQuery: vi.fn(),
  mockUseCancelExcuseMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/services', () => ({
  useMemberServiceExcusesQuery: (...args: unknown[]) => mockUseMemberServiceExcusesQuery(...args),
  useCancelExcuseMutation: () => mockUseCancelExcuseMutation(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('FiledExcusesModal', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCancelExcuseMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('renders loading state when query is loading', () => {
    mockUseMemberServiceExcusesQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
    });

    renderWithClient(<FiledExcusesModal isOpen={true} onClose={vi.fn()} userId="user-1" />);

    expect(screen.getByText('Loading your excuse requests...')).toBeInTheDocument();
  });

  it('renders error state when query fails', () => {
    mockUseMemberServiceExcusesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    });

    renderWithClient(<FiledExcusesModal isOpen={true} onClose={vi.fn()} userId="user-1" />);

    expect(
      screen.getByText('Failed to load excuse requests. Please try again later.'),
    ).toBeInTheDocument();
  });

  it('renders empty state when no excuses are found', () => {
    mockUseMemberServiceExcusesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    renderWithClient(<FiledExcusesModal isOpen={true} onClose={vi.fn()} userId="user-1" />);

    expect(screen.getByText('No filed excuse requests found')).toBeInTheDocument();
  });

  it('renders filed excuse requests with status badges and services', () => {
    const mockExcuses: ServiceExcuseRequest[] = [
      {
        id: 'excuse-1',
        user_id: 'user-1',
        member_id: 'MEM-001',
        request_date: '2026-12-20',
        services: ['9AM', '12NN'],
        reason: 'Out of town',
        status: 'approved',
        created_at: '2026-10-15T08:00:00Z',
        updated_at: '2026-10-15T08:00:00Z',
      },
      {
        id: 'excuse-2',
        user_id: 'user-1',
        member_id: 'MEM-001',
        request_date: '2026-09-13',
        services: ['All Services'],
        reason: null,
        status: 'cancelled',
        created_at: '2026-09-01T08:00:00Z',
        updated_at: '2026-09-02T08:00:00Z',
      },
    ];

    mockUseMemberServiceExcusesQuery.mockReturnValue({
      data: mockExcuses,
      isLoading: false,
      isError: false,
    });

    renderWithClient(<FiledExcusesModal isOpen={true} onClose={vi.fn()} userId="user-1" />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();
    expect(screen.getByText('All Services')).toBeInTheDocument();
    expect(screen.getByText('"Out of town"')).toBeInTheDocument();
    expect(screen.getByText('(No reason specified)')).toBeInTheDocument();

    const activeBadge = screen.getByText('Active');
    expect(activeBadge).toHaveClass('bg-primary');
    expect(activeBadge).toHaveClass('text-white');

    const cancelledBadge = screen.getByText('Cancelled');
    expect(cancelledBadge).toHaveClass('border-border');
    expect(cancelledBadge).toHaveClass('text-muted');
  });

  it('normalizes single quoted comma-separated services into distinct pills', () => {
    const mockExcuses: ServiceExcuseRequest[] = [
      {
        id: 'excuse-dirty',
        user_id: 'user-1',
        member_id: 'MEM-001',
        request_date: '2026-11-15',
        services: ['"9AM","12NN","3PM"'],
        reason: 'Testing normalization',
        status: 'approved',
        created_at: '2026-10-15T08:00:00Z',
        updated_at: '2026-10-15T08:00:00Z',
      },
    ];

    mockUseMemberServiceExcusesQuery.mockReturnValue({
      data: mockExcuses,
      isLoading: false,
      isError: false,
    });

    renderWithClient(<FiledExcusesModal isOpen={true} onClose={vi.fn()} userId="user-1" />);

    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();
    expect(screen.getByText('3PM')).toBeInTheDocument();
    expect(screen.queryByText('"9AM","12NN","3PM"')).not.toBeInTheDocument();
  });

  it('allows cancelling an upcoming approved excuse request', async () => {
    const mockExcuses: ServiceExcuseRequest[] = [
      {
        id: 'excuse-upcoming',
        user_id: 'user-1',
        member_id: 'MEM-001',
        request_date: '2026-12-27',
        services: ['9AM'],
        reason: 'Family event',
        status: 'approved',
        created_at: '2026-10-15T08:00:00Z',
        updated_at: '2026-10-15T08:00:00Z',
      },
    ];

    mockUseMemberServiceExcusesQuery.mockReturnValue({
      data: mockExcuses,
      isLoading: false,
      isError: false,
    });
    mockMutateAsync.mockResolvedValueOnce(undefined);

    renderWithClient(<FiledExcusesModal isOpen={true} onClose={vi.fn()} userId="user-1" />);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel Request' });
    expect(cancelBtn).toBeInTheDocument();
    expect(cancelBtn).toHaveClass('text-danger');

    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('excuse-upcoming');
      expect(toast.success).toHaveBeenCalledWith('Excuse request cancelled successfully.');
    });
  });
});
