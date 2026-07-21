import { supabase } from '@/lib/infrastructure';

import type { AdminAuthState, AdminRole } from './types';

export const ADMIN_AUTH_QUERY_KEY = ['admin-auth-state'] as const;

type AdminRow = {
  role: AdminRole;
};

export async function fetchAdminAuthState(): Promise<AdminAuthState> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    return {
      isAuthenticated: false,
      session: null,
      adminRole: null,
    };
  }

  const { data: adminRow, error: adminError } = await supabase
    .from('admins')
    .select('role')
    .eq('auth_user_id', session.user.id)
    .maybeSingle<AdminRow>();

  if (adminError) {
    throw adminError;
  }

  if (!adminRow) {
    return {
      isAuthenticated: false,
      session,
      adminRole: null,
    };
  }

  return {
    isAuthenticated: true,
    session,
    adminRole: adminRow.role,
  };
}
