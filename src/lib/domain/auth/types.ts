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
  name: string;
  avatar_object_key: string | null;
  email: string;
  role: AdminRole;
  created_at: string;
};

export type AuthUserItem = {
  id: string;
  name: string;
  email: string;
  avatar_object_key: string | null;
  created_at: string;
  last_sign_in_at: string | null;
};
