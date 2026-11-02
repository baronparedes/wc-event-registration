import { supabase } from '@/lib/infrastructure';

import type {
  AdminAuthContextRow,
  AdminRoleAssignment,
  ApproverUserItem,
  AuthUserItem,
} from './types';

export async function fetchMyAdminAuthContext(): Promise<AdminAuthContextRow | null> {
  const { data, error } = await supabase.rpc('get_my_admin_auth_context');
  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = Array.isArray(data)
    ? (data[0] as AdminAuthContextRow | undefined)
    : (data as AdminAuthContextRow);

  if (!row || !row.role) {
    return null;
  }

  return {
    role: row.role,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  };
}

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

export async function fetchApproverUsers(): Promise<ApproverUserItem[]> {
  const { data, error } = await supabase.rpc('list_approver_users');
  if (error) {
    throw error;
  }
  return (data as ApproverUserItem[]) ?? [];
}
