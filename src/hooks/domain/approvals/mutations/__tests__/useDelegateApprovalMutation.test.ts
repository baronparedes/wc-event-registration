import type { ReactNode } from 'react';
import { createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APPROVAL_REQUESTS_QUERY_KEY } from '@/hooks/domain/approvals/queries/useApprovalRequestsQuery';
import { type DelegateApprovalResponse, delegateApproval } from '@/lib/domain/approvals';

import { useDelegateApprovalMutation } from '../useDelegateApprovalMutation';

vi.mock('@/lib/domain/approvals', () => ({
  delegateApproval: vi.fn(),
}));

function createWrapper(customClient?: QueryClient) {
  const queryClient =
    customClient ||
    new QueryClient({
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

describe('useDelegateApprovalMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates approval successfully and invalidates queries', async () => {
    const mockResponse: DelegateApprovalResponse = {
      success: true,
      message: 'Delegated',
      approval_id: 'req-1',
      assigned_to_email: 'slod1@example.com',
    };
    vi.mocked(delegateApproval).mockResolvedValue(mockResponse);

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDelegateApprovalMutation(), {
      wrapper: createWrapper(queryClient),
    });

    const mutationData = {
      approval_id: 'req-1',
      assigned_to_email: 'slod1@example.com',
    };

    result.current.mutate(mutationData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(delegateApproval).toHaveBeenCalledWith(mutationData);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: APPROVAL_REQUESTS_QUERY_KEY,
    });
  });

  it('handles error state properly', async () => {
    const error = new Error('Failed to delegate approval');
    vi.mocked(delegateApproval).mockRejectedValue(error);

    const { result } = renderHook(() => useDelegateApprovalMutation(), {
      wrapper: createWrapper(),
    });

    const mutationData = {
      approval_id: 'req-1',
      assigned_to_email: 'slod1@example.com',
    };

    result.current.mutate(mutationData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});
