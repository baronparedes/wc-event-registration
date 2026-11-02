import type { Session } from '@supabase/supabase-js';

export type AdminRole = 'admin' | 'super_admin' | 'slod' | 'vmt' | 'imt' | 'kiosk';

export type AssignableAdminRole = Exclude<AdminRole, 'super_admin'>;

export const ALL_ADMIN_PERMISSION_KEYS = [
  'canWriteAdminData',
  'canReadAdminData',
  'canReadAdminMemberData',
  'canManageAttendanceSavedViews',
  'canExportAdminReports',
  'canAccessAttendanceCheckIn',
  'canViewMemberHistory',
  'canManageAdminRoles',
  'canReadDashboard',
  'canManageServices',
] as const;

export type AdminPermissionKey = (typeof ALL_ADMIN_PERMISSION_KEYS)[number];

export type AdminAuthContextRow = {
  role: AdminRole;
  permissions: AdminPermissionKey[];
};

export type AdminAuthState = {
  isAuthenticated: boolean;
  session: Session | null;
  adminRole: AdminRole | null;
  permissions?: readonly AdminPermissionKey[];
};

export type AdminRoleAssignment = {
  id: string;
  auth_user_id: string;
  name: string;
  avatar_object_key: string | null;
  has_member_profile: boolean;
  email: string;
  role: AdminRole;
  created_at: string;
};

export type AuthUserItem = {
  id: string;
  name: string;
  full_name?: string;
  last_name?: string | null;
  email: string;
  avatar_object_key: string | null;
  has_member_profile: boolean;
  created_at: string;
  last_sign_in_at: string | null;
};

export type ApproverUserItem = {
  auth_user_id: string;
  email: string;
  name: string;
  role: string;
  avatar_object_key: string | null;
};
