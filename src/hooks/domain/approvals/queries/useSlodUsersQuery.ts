import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchSlodUsers } from '@/lib/domain/approvals';
import type { SlodUserItem } from '@/lib/domain/approvals';

export const SLOD_USERS_QUERY_KEY = ['slod-users'] as const;

export function useSlodUsersQuery(options?: { enabled?: boolean }) {
  return useQuery<SlodUserItem[], Error>({
    queryKey: SLOD_USERS_QUERY_KEY,
    queryFn: () => fetchSlodUsers(),
    staleTime: QUERY_STALE_TIME_MS.adminList,
    enabled: options?.enabled ?? true,
  });
}
