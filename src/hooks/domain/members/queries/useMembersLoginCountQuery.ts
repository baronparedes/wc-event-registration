import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchMembersLoginCounts } from '@/lib/domain/members';

export function useMembersLoginCountQuery() {
  return useQuery({
    queryKey: ['members-login-count'] as const,
    queryFn: () => fetchMembersLoginCounts(12),
    staleTime: QUERY_STALE_TIME_MS.oneDay,
  });
}
