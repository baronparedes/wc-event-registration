import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchApprovalRequests } from '@/lib/domain/approvals';
import type { ApprovalRequest, FetchApprovalsFilters } from '@/lib/domain/approvals';

export const APPROVAL_REQUESTS_QUERY_KEY = ['approval-requests'] as const;

export const approvalRequestsQueryKey = (filters?: FetchApprovalsFilters) =>
  [
    ...APPROVAL_REQUESTS_QUERY_KEY,
    filters?.status ?? 'all',
    filters?.entity_type ?? 'all',
    filters?.search ?? '',
  ] as const;

export function useApprovalRequestsQuery(filters?: FetchApprovalsFilters) {
  return useQuery<ApprovalRequest[], Error>({
    queryKey: approvalRequestsQueryKey(filters),
    queryFn: () => fetchApprovalRequests(filters),
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
