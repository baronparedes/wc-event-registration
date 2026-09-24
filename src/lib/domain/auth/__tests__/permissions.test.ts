import { describe, expect, it } from 'vitest';

import {
  ADMIN_PERMISSION_POLICIES,
  ALL_ADMIN_PERMISSION_KEYS,
  ROLE_PERMISSION_GRANTS,
  canAdminPerform,
  getAdminPermissionPolicy,
} from '@/lib/domain/auth/permissions';
import type { AdminRole } from '@/lib/domain/auth/types';

describe('admin permission policies', () => {
  it('defines role permission grants with proper inheritance', () => {
    // super_admin inherits all admin permissions plus canManageAdminRoles
    const adminPerms = ROLE_PERMISSION_GRANTS.admin;
    const superAdminPerms = ROLE_PERMISSION_GRANTS.super_admin;

    adminPerms.forEach((perm) => {
      expect(superAdminPerms).toContain(perm);
    });

    expect(superAdminPerms).toContain('canManageAdminRoles');
    expect(adminPerms).not.toContain('canManageAdminRoles');
  });

  it('generates centralized policy data for all roles', () => {
    const roles: AdminRole[] = ['admin', 'super_admin', 'slod', 'imt', 'kiosk'];
    expect(ADMIN_PERMISSION_POLICIES.map((p) => p.role)).toEqual(roles);

    ADMIN_PERMISSION_POLICIES.forEach((policy) => {
      ALL_ADMIN_PERMISSION_KEYS.forEach((key) => {
        expect(typeof policy.permissions[key]).toBe('boolean');
      });
    });
  });

  it('returns the matching policy for a role', () => {
    const slodPolicy = getAdminPermissionPolicy('slod');
    expect(slodPolicy).toEqual({
      role: 'slod',
      permissions: {
        canWriteAdminData: false,
        canReadAdminData: true,
        canReadAdminMemberData: true,
        canManageAttendanceSavedViews: true,
        canExportAdminReports: true,
        canAccessAttendanceCheckIn: false,
        canViewMemberHistory: true,
        canManageAdminRoles: false,
        canReadDashboard: true,
        canManageServices: true,
      },
    });

    expect(getAdminPermissionPolicy(null)).toBeUndefined();
    expect(getAdminPermissionPolicy(undefined)).toBeUndefined();
  });

  it('supports generic and specific permission checks', () => {
    expect(canAdminPerform('admin', 'canWriteAdminData')).toBe(true);
    expect(canAdminPerform('admin', 'canReadAdminData')).toBe(true);
    expect(canAdminPerform('admin', 'canManageServices')).toBe(true);
    expect(canAdminPerform('super_admin', 'canManageServices')).toBe(true);
    expect(canAdminPerform('super_admin', 'canManageAdminRoles')).toBe(true);
    expect(canAdminPerform('admin', 'canManageAdminRoles')).toBe(false);
    expect(canAdminPerform('imt', 'canReadAdminMemberData')).toBe(true);
    expect(canAdminPerform('slod', 'canManageAttendanceSavedViews')).toBe(true);
    expect(canAdminPerform('slod', 'canExportAdminReports')).toBe(true);
    expect(canAdminPerform('slod', 'canManageServices')).toBe(true);
    expect(canAdminPerform('imt', 'canManageServices')).toBe(false);
    expect(canAdminPerform('kiosk', 'canAccessAttendanceCheckIn')).toBe(true);
    expect(canAdminPerform('kiosk', 'canManageServices')).toBe(false);
  });

  it('denies access for missing or disabled roles', () => {
    expect(canAdminPerform(null, 'canReadAdminData')).toBe(false);
    expect(canAdminPerform(undefined, 'canReadAdminData')).toBe(false);
    expect(canAdminPerform('kiosk', 'canWriteAdminData')).toBe(false);
    expect(canAdminPerform('kiosk', 'canReadAdminData')).toBe(false);
    expect(canAdminPerform('kiosk', 'canReadAdminMemberData')).toBe(false);
    expect(canAdminPerform('slod', 'canWriteAdminData')).toBe(false);
    expect(canAdminPerform('admin', 'canManageAdminRoles')).toBe(false);
  });
});
