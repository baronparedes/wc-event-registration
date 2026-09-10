import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

import { ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';

type RevokeRoleVariables = {
  adminId: string;
};

export function useRevokeAdminRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adminId }: RevokeRoleVariables) => {
      const { error } = await supabase.from('admins').delete().eq('id', adminId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_QUERY_KEY });
    },
  });
}
