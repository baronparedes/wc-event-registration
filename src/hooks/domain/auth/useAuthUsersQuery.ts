import { useQuery } from '@tanstack/react-query';

import type { AuthUserItem } from '@/lib/domain/auth';
import { supabase } from '@/lib/infrastructure';

export const AUTH_USERS_QUERY_KEY = ['auth-users'] as const;

export function useAuthUsersQuery(search = '', enabled = true) {
  const trimmedSearch = search.trim();

  return useQuery<AuthUserItem[]>({
    queryKey: [...AUTH_USERS_QUERY_KEY, trimmedSearch],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_auth_users', {
        p_search: trimmedSearch || null,
      });
      if (error) {
        throw error;
      }
      return (data as AuthUserItem[]) ?? [];
    },
    enabled,
  });
}
