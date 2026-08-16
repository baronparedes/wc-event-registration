import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export function useOfflineSessionUserQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['offline-session-user'],
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      return session?.user ?? null;
    },
    enabled,
    staleTime: Infinity,
    gcTime: 0,
  });
}
