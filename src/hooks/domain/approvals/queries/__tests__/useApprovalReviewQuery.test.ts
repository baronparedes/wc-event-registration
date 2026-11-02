import { ReactNode, createElement } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ApprovalReviewData, fetchApprovalReviewByToken } from '@/lib/domain/approvals';

import { useApprovalReviewQuery } from '../useApprovalReviewQuery';

vi.mock('@/lib/domain/approvals', () => ({
  fetchApprovalReviewByToken: vi.fn(),
}));

const mockApprovalReviewData: ApprovalReviewData = {
  id: 'req-1',
  status: 'pending',
  entity_type: 'leave',
  reviewer_name: 'Test Reviewer',
} as ApprovalReviewData;

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

describe('useApprovalReviewQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches approval review data successfully when token is provided', async () => {
    vi.mocked(fetchApprovalReviewByToken).mockResolvedValue(mockApprovalReviewData);

    const { result } = renderHook(() => useApprovalReviewQuery('valid-token'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockApprovalReviewData);
    expect(fetchApprovalReviewByToken).toHaveBeenCalledWith('valid-token');
  });

  it('does not fetch when token is not provided', () => {
    const { result } = renderHook(() => useApprovalReviewQuery(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(fetchApprovalReviewByToken).not.toHaveBeenCalled();
  });

  it('handles error state properly', async () => {
    const error = new Error('Failed to fetch approval review');
    vi.mocked(fetchApprovalReviewByToken).mockRejectedValue(error);

    const { result } = renderHook(() => useApprovalReviewQuery('invalid-token'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
    expect(fetchApprovalReviewByToken).toHaveBeenCalledWith('invalid-token');
  });
});
