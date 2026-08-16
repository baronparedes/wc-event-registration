import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ADMIN_AUTH_QUERY_KEY, type AdminAuthState } from '@/lib/domain/auth';
import { clearOfflineAttendanceData, supabase } from '@/lib/infrastructure';

export function useAdminLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await clearOfflineAttendanceData();
      queryClient.setQueryData<AdminAuthState>(ADMIN_AUTH_QUERY_KEY, {
        isAuthenticated: false,
        session: null,
        adminRole: null,
      });
      queryClient.invalidateQueries({ queryKey: ADMIN_AUTH_QUERY_KEY });
    },
  });
}
