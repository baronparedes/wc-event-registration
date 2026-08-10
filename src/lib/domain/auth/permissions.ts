import type { AdminRole } from './types';

export type AdminPermissionKey =
  | 'canWriteAdminData'
  | 'canReadAdminData'
  | 'canReadAdminMemberData'
  | 'canManageAttendanceSavedViews'
  | 'canExportAdminReports'
  | 'canAccessAttendanceCheckIn';

export type AdminPermissions = Record<AdminPermissionKey, boolean>;

export type AdminPermissionPolicy = {
  role: AdminRole;
  permissions: AdminPermissions;
};

export const ADMIN_PERMISSION_POLICIES = [
  {
    role: 'admin',
    permissions: {
      canWriteAdminData: true,
      canReadAdminData: true,
      canReadAdminMemberData: true,
      canManageAttendanceSavedViews: true,
      canExportAdminReports: true,
      canAccessAttendanceCheckIn: true,
    },
  },
  {
    role: 'super_admin',
    permissions: {
      canWriteAdminData: true,
      canReadAdminData: true,
      canReadAdminMemberData: true,
      canManageAttendanceSavedViews: true,
      canExportAdminReports: true,
      canAccessAttendanceCheckIn: true,
    },
  },
  {
    role: 'slod',
    permissions: {
      canWriteAdminData: false,
      canReadAdminData: true,
      canReadAdminMemberData: true,
      canManageAttendanceSavedViews: true,
      canExportAdminReports: true,
      canAccessAttendanceCheckIn: false,
    },
  },
  {
    role: 'imt',
    permissions: {
      canWriteAdminData: false,
      canReadAdminData: false,
      canReadAdminMemberData: true,
      canManageAttendanceSavedViews: false,
      canExportAdminReports: false,
      canAccessAttendanceCheckIn: false,
    },
  },
  {
    role: 'kiosk',
    permissions: {
      canWriteAdminData: false,
      canReadAdminData: false,
      canReadAdminMemberData: false,
      canManageAttendanceSavedViews: false,
      canExportAdminReports: false,
      canAccessAttendanceCheckIn: true,
    },
  },
] as const satisfies readonly AdminPermissionPolicy[];

export function getAdminPermissionPolicy(
  role: AdminRole | null | undefined,
): AdminPermissionPolicy | undefined {
  return ADMIN_PERMISSION_POLICIES.find((policy) => policy.role === role);
}

export function canAdminPerform(
  role: AdminRole | null | undefined,
  permission: AdminPermissionKey,
): boolean {
  return getAdminPermissionPolicy(role)?.permissions[permission] ?? false;
}
