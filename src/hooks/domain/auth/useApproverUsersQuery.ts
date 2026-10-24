import { useQuery } from '@tanstack/react-query';

import { type ApproverUserItem, fetchApproverUsers } from '@/lib/domain/auth';

export const APPROVER_USERS_QUERY_KEY = ['approver-users'] as const;

export function useApproverUsersQuery(enabled = true) {
  return useQuery<ApproverUserItem[]>({
    queryKey: APPROVER_USERS_QUERY_KEY,
    queryFn: fetchApproverUsers,
    enabled,
  });
}
