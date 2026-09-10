import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AssignableAdminRole } from '@/lib/domain/auth';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';

export type ManageAdminRoleVariables =
  | { action: 'assign'; auth_user_id: string; role: AssignableAdminRole }
  | { action: 'update'; admin_id: string; role: AssignableAdminRole }
  | { action: 'revoke'; admin_id: string };

type ManageAdminRoleResponse = { success: true };

const manageAdminRole = createEdgeFunctionCaller<ManageAdminRoleVariables, ManageAdminRoleResponse>(
  'manage-admin-role',
);

export function useManageAdminRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: ManageAdminRoleVariables) => manageAdminRole(variables),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_QUERY_KEY });
    },
  });
}
