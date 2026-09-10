import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AssignableAdminRole } from '@/lib/domain/auth';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';

type AssignRoleVariables = {
  authUserId: string;
  role: AssignableAdminRole;
};

const manageAdminRole = createEdgeFunctionCaller<
  { action: 'assign'; auth_user_id: string; role: AssignableAdminRole },
  { success: true }
>('manage-admin-role');

export function useAssignAdminRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ authUserId, role }: AssignRoleVariables) =>
      manageAdminRole({ action: 'assign', auth_user_id: authUserId, role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_QUERY_KEY });
    },
  });
}
