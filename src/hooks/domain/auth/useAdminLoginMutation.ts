import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ADMIN_AUTH_QUERY_KEY, fetchAdminAuthState } from '@/lib/domain/auth';
import { supabase } from '@/lib/infrastructure';

export function useAdminLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }

      const authState = await fetchAdminAuthState();

      if (!authState.isAuthenticated) {
        await supabase.auth.signOut();
        throw new Error('This account is not authorized as an admin.');
      }

      return authState;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY });
    },
  });
}
