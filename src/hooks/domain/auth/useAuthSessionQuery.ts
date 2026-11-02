import { useQuery } from '@tanstack/react-query';

import { AUTH_SESSION_QUERY_KEY, fetchAuthSession } from '@/lib/domain/auth';

export function useAuthSessionQuery() {
  return useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: fetchAuthSession,
    staleTime: Infinity,
  });
}
