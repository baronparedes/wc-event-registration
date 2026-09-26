import { useQuery } from '@tanstack/react-query';

import { type AdminRoleAssignment, fetchAdminRoles } from '@/lib/domain/auth';

export const ADMIN_ROLES_QUERY_KEY = ['admin-roles'] as const;

export function useAdminRolesQuery(enabled = true) {
  return useQuery<AdminRoleAssignment[]>({
    queryKey: ADMIN_ROLES_QUERY_KEY,
    queryFn: fetchAdminRoles,
    enabled,
  });
}
