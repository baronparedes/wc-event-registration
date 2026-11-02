import { ReactNode, createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApprovalRequest, fetchApprovalRequests } from '@/lib/domain/approvals';

import { useApprovalRequestsQuery } from '../useApprovalRequestsQuery';

vi.mock('@/lib/domain/approvals', () => ({
  fetchApprovalRequests: vi.fn(),
}));

const mockApprovalRequests: ApprovalRequest[] = [
  { id: 'req-1', status: 'pending', entity_type: 'leave' } as ApprovalRequest,
  { id: 'req-2', status: 'approved', entity_type: 'expense' } as ApprovalRequest,
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ['/'] }, children),
    );
  };
}

describe('useApprovalRequestsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches approval requests successfully without filters', async () => {
    vi.mocked(fetchApprovalRequests).mockResolvedValue(mockApprovalRequests);

    const { result } = renderHook(() => useApprovalRequestsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockApprovalRequests);
    expect(fetchApprovalRequests).toHaveBeenCalledWith(undefined);
  });

  it('fetches approval requests successfully with filters', async () => {
    vi.mocked(fetchApprovalRequests).mockResolvedValue(mockApprovalRequests);

    const filters = { status: 'pending' as const, entity_type: 'leave' as const, search: 'test' };

    const { result } = renderHook(() => useApprovalRequestsQuery(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockApprovalRequests);
    expect(fetchApprovalRequests).toHaveBeenCalledWith(filters);
  });

  it('handles error state properly', async () => {
    const error = new Error('Failed to fetch approvals');
    vi.mocked(fetchApprovalRequests).mockRejectedValue(error);

    const { result } = renderHook(() => useApprovalRequestsQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});
