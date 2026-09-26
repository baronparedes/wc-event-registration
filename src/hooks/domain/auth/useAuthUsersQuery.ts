import { useQuery } from '@tanstack/react-query';

import { type AuthUserItem, fetchAuthUsers } from '@/lib/domain/auth';

export const AUTH_USERS_QUERY_KEY = ['auth-users'] as const;

export function useAuthUsersQuery(search = '', enabled = true) {
  const trimmedSearch = search.trim();

  return useQuery<AuthUserItem[]>({
    queryKey: [...AUTH_USERS_QUERY_KEY, trimmedSearch],
    queryFn: () => fetchAuthUsers(trimmedSearch),
    enabled,
  });
}
