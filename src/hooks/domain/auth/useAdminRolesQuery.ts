import { useQuery } from '@tanstack/react-query';

import type { AdminRoleAssignment } from '@/lib/domain/auth';
import { supabase } from '@/lib/infrastructure';

export const ADMIN_ROLES_QUERY_KEY = ['admin-roles'] as const;

export function useAdminRolesQuery(enabled = true) {
  return useQuery<AdminRoleAssignment[]>({
    queryKey: ADMIN_ROLES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_roles');
      if (error) {
        throw error;
      }
      return (data as AdminRoleAssignment[]) ?? [];
    },
    enabled,
  });
}
