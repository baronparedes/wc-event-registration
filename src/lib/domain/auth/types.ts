import type { Session } from '@supabase/supabase-js';

export type AdminRole = 'admin' | 'super_admin' | 'slod' | 'imt' | 'kiosk';

export type AssignableAdminRole = Exclude<AdminRole, 'super_admin'>;

export type AdminAuthState = {
  isAuthenticated: boolean;
  session: Session | null;
  adminRole: AdminRole | null;
};

export type AdminRoleAssignment = {
  id: string;
  auth_user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
};

export type AuthUserItem = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
};
