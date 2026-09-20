import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { ADMIN_AUTH_QUERY_KEY, type AdminAuthState, fetchAdminAuthState } from '@/lib/domain/auth';

export function useAdminAuthQuery() {
  return useQuery<AdminAuthState>({
    queryKey: ADMIN_AUTH_QUERY_KEY,
    queryFn: fetchAdminAuthState,
    staleTime: QUERY_STALE_TIME_MS.detail,
  });
}
