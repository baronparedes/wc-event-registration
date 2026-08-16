import { useQuery } from '@tanstack/react-query';

import { ADMIN_AUTH_QUERY_KEY, type AdminAuthState, fetchAdminAuthState } from '@/lib/domain/auth';

export function useAdminAuthQuery(enabled = true) {
  return useQuery<AdminAuthState>({
    queryKey: ADMIN_AUTH_QUERY_KEY,
    queryFn: fetchAdminAuthState,
    enabled,
  });
}
