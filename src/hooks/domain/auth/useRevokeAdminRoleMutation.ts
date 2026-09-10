import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_ROLES_QUERY_KEY } from './useAdminRolesQuery';

type RevokeRoleVariables = {
  adminId: string;
};

const manageAdminRole = createEdgeFunctionCaller<
  { action: 'revoke'; admin_id: string },
  { success: true }
>('manage-admin-role');

export function useRevokeAdminRoleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ adminId }: RevokeRoleVariables) =>
      manageAdminRole({ action: 'revoke', admin_id: adminId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ROLES_QUERY_KEY });
    },
  });
}
