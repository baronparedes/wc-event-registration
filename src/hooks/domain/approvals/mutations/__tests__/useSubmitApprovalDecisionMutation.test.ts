import { ReactNode, createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APPROVAL_REQUESTS_QUERY_KEY } from '@/hooks/domain/approvals/queries/useApprovalRequestsQuery';
import { APPROVAL_REVIEW_QUERY_KEY } from '@/hooks/domain/approvals/queries/useApprovalReviewQuery';
import { type ApprovalDecisionResponse, submitApprovalDecision } from '@/lib/domain/approvals';

import { useSubmitApprovalDecisionMutation } from '../useSubmitApprovalDecisionMutation';

vi.mock('@/lib/domain/approvals', () => ({
  submitApprovalDecision: vi.fn(),
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

describe('useSubmitApprovalDecisionMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits approval decision successfully and invalidates queries', async () => {
    const mockResponse: ApprovalDecisionResponse = { success: true };
    vi.mocked(submitApprovalDecision).mockResolvedValue(mockResponse);

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubmitApprovalDecisionMutation(), {
      wrapper: createWrapper(queryClient),
    });

    const mutationData = {
      approval_request_id: 'req-1',
      decision: 'approved' as const,
      notes: 'Looks good',
    };

    result.current.mutate(mutationData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockResponse);
    expect(submitApprovalDecision).toHaveBeenCalledWith(mutationData);
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: APPROVAL_REQUESTS_QUERY_KEY,
    });
  });

  it('invalidates specific token review query when token is provided', async () => {
    const mockResponse: ApprovalDecisionResponse = { success: true };
    vi.mocked(submitApprovalDecision).mockResolvedValue(mockResponse);

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSubmitApprovalDecisionMutation(), {
      wrapper: createWrapper(queryClient),
    });

    const mutationData = {
      approval_request_id: 'req-1',
      decision: 'approved' as const,
      token: 'test-token',
    };

    result.current.mutate(mutationData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: [...APPROVAL_REVIEW_QUERY_KEY, 'test-token'],
    });
  });

  it('handles error state properly', async () => {
    const error = new Error('Failed to submit decision');
    vi.mocked(submitApprovalDecision).mockRejectedValue(error);

    const { result } = renderHook(() => useSubmitApprovalDecisionMutation(), {
      wrapper: createWrapper(),
    });

    const mutationData = {
      approval_request_id: 'req-1',
      decision: 'approved' as const,
    };

    result.current.mutate(mutationData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});
