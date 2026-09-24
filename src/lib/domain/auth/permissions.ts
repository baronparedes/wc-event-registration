import type { AdminRole } from './types';

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

export type AdminPermissions = Record<AdminPermissionKey, boolean>;

export type AdminPermissionPolicy = {
  role: AdminRole;
  permissions: AdminPermissions;
};

const BASE_ADMIN_PERMISSIONS: readonly AdminPermissionKey[] = [
  'canWriteAdminData',
  'canReadAdminData',
  'canReadAdminMemberData',
  'canManageAttendanceSavedViews',
  'canExportAdminReports',
  'canAccessAttendanceCheckIn',
  'canViewMemberHistory',
  'canReadDashboard',
  'canManageServices',
];

export const ROLE_PERMISSION_GRANTS: Record<AdminRole, readonly AdminPermissionKey[]> = {
  admin: BASE_ADMIN_PERMISSIONS,
  super_admin: [...BASE_ADMIN_PERMISSIONS, 'canManageAdminRoles'],
  slod: [
    'canReadAdminData',
    'canReadAdminMemberData',
    'canManageAttendanceSavedViews',
    'canExportAdminReports',
    'canViewMemberHistory',
    'canReadDashboard',
    'canManageServices',
  ],
  imt: ['canReadAdminMemberData', 'canReadDashboard'],
  kiosk: ['canAccessAttendanceCheckIn'],
};

const ROLE_PERMISSION_SETS: Record<AdminRole, ReadonlySet<AdminPermissionKey>> = {
  admin: new Set(ROLE_PERMISSION_GRANTS.admin),
  super_admin: new Set(ROLE_PERMISSION_GRANTS.super_admin),
  slod: new Set(ROLE_PERMISSION_GRANTS.slod),
  imt: new Set(ROLE_PERMISSION_GRANTS.imt),
  kiosk: new Set(ROLE_PERMISSION_GRANTS.kiosk),
};

export const ADMIN_PERMISSION_POLICIES: readonly AdminPermissionPolicy[] = (
  Object.keys(ROLE_PERMISSION_GRANTS) as AdminRole[]
).map((role) => ({
  role,
  permissions: ALL_ADMIN_PERMISSION_KEYS.reduce<AdminPermissions>((acc, key) => {
    acc[key] = ROLE_PERMISSION_SETS[role].has(key);
    return acc;
  }, {} as AdminPermissions),
}));

export function getAdminPermissionPolicy(
  role: AdminRole | null | undefined,
): AdminPermissionPolicy | undefined {
  if (!role) return undefined;
  return ADMIN_PERMISSION_POLICIES.find((policy) => policy.role === role);
}

export function canAdminPerform(
  role: AdminRole | null | undefined,
  permission: AdminPermissionKey,
): boolean {
  if (!role) return false;
  return ROLE_PERMISSION_SETS[role]?.has(permission) ?? false;
}
