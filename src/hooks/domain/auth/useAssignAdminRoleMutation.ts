import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AssignableAdminRole } from '@/lib/domain/auth';
import { supabase } from '@/lib/infrastructure';

import { ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';

type AssignRoleVariables = {
  authUserId: string;
  role: AssignableAdminRole;
};

export function useAssignAdminRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ authUserId, role }: AssignRoleVariables) => {
      const { data, error } = await supabase
        .from('admins')
        .upsert({ auth_user_id: authUserId, role }, { onConflict: 'auth_user_id' })
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
