import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AssignableAdminRole } from '@/lib/domain/auth';
import { supabase } from '@/lib/infrastructure';

import { ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';

type UpdateRoleVariables = {
  adminId: string;
  role: AssignableAdminRole;
};

export function useUpdateAdminRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ adminId, role }: UpdateRoleVariables) => {
      const { data, error } = await supabase
        .from('admins')
        .update({ role })
        .eq('id', adminId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_QUERY_KEY });
    },
  });
}
