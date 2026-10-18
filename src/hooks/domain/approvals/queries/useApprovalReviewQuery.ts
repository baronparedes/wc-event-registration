import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchApprovalReviewByToken } from '@/lib/domain/approvals';
import type { ApprovalReviewData } from '@/lib/domain/approvals';

export const APPROVAL_REVIEW_QUERY_KEY = ['approval-review'] as const;

export const approvalReviewQueryKey = (token: string) =>
  [...APPROVAL_REVIEW_QUERY_KEY, token] as const;

export function useApprovalReviewQuery(token: string | undefined) {
  return useQuery<ApprovalReviewData, Error>({
    queryKey: approvalReviewQueryKey(token ?? ''),
    queryFn: () => {
      if (!token) throw new Error('Token is required');
      return fetchApprovalReviewByToken(token);
    },
    enabled: Boolean(token),
    staleTime: QUERY_STALE_TIME_MS.short,
    retry: false,
  });
}
