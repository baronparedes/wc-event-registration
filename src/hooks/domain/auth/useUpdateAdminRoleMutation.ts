import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AssignableAdminRole } from '@/lib/domain/auth';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';

type UpdateRoleVariables = {
  adminId: string;
  role: AssignableAdminRole;
};

const manageAdminRole = createEdgeFunctionCaller<
  { action: 'update'; admin_id: string; role: AssignableAdminRole },
  { success: true }
>('manage-admin-role');

export function useUpdateAdminRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ adminId, role }: UpdateRoleVariables) =>
      manageAdminRole({ action: 'update', admin_id: adminId, role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_QUERY_KEY });
    },
  });
}
