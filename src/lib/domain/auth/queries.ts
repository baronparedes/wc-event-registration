import { supabase } from '@/lib/infrastructure';

import { fetchMyAdminAuthContext } from './api';
import type { AdminAuthState } from './types';

export const ADMIN_AUTH_QUERY_KEY = ['admin-auth-state'] as const;

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
      permissions: [],
    };
  }

  const adminContext = await fetchMyAdminAuthContext();

  if (!adminContext) {
    return {
      isAuthenticated: false,
      session,
      adminRole: null,
      permissions: [],
    };
  }

  return {
    isAuthenticated: true,
    session,
    adminRole: adminContext.role,
    permissions: adminContext.permissions,
  };
}
