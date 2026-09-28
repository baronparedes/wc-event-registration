import { supabase } from '@/lib/infrastructure';

import type { AdminRoleAssignment, AuthUserItem } from './types';

export async function fetchAuthUsers(
  search: string,
  verifiedOnly = false,
): Promise<AuthUserItem[]> {
  const parameters = { p_search: search || null };
  const result = verifiedOnly
    ? await supabase.rpc('list_verified_auth_users', parameters)
    : await supabase.rpc('list_auth_users', parameters);
  const { data, error } = result;
  if (error) {
    throw error;
  }
  return (data as AuthUserItem[]) ?? [];
}

export async function fetchAdminRoles(): Promise<AdminRoleAssignment[]> {
  const { data, error } = await supabase.rpc('get_admin_roles');
  if (error) {
    throw error;
  }
  return (data as AdminRoleAssignment[]) ?? [];
}
