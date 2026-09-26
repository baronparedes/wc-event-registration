import { supabase } from '@/lib/infrastructure';

import type { AdminRoleAssignment, AuthUserItem } from './types';

export async function fetchAuthUsers(search: string): Promise<AuthUserItem[]> {
  const { data, error } = await supabase.rpc('list_auth_users', {
    p_search: search || null,
  });
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
