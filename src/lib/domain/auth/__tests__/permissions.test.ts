import { describe, expect, it } from 'vitest';

import {
  ADMIN_PERMISSION_POLICIES,
  canAdminPerform,
  getAdminPermissionPolicy,
} from '@/lib/domain/auth/permissions';

describe('admin permission policies', () => {
  it('keeps policy data centralized by role', () => {
    expect(ADMIN_PERMISSION_POLICIES).toEqual([
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
    ]);
  });

  it('returns the matching policy for a role', () => {
    expect(getAdminPermissionPolicy('slod')).toEqual({
      role: 'slod',
      permissions: {
        canWriteAdminData: false,
        canReadAdminData: true,
        canReadAdminMemberData: true,
        canManageAttendanceSavedViews: true,
        canExportAdminReports: true,
        canAccessAttendanceCheckIn: false,
      },
    });
  });

  it('supports generic and specific permission checks', () => {
    expect(canAdminPerform('admin', 'canWriteAdminData')).toBe(true);
    expect(canAdminPerform('admin', 'canReadAdminData')).toBe(true);
    expect(canAdminPerform('imt', 'canReadAdminMemberData')).toBe(true);
    expect(canAdminPerform('slod', 'canManageAttendanceSavedViews')).toBe(true);
    expect(canAdminPerform('slod', 'canExportAdminReports')).toBe(true);
    expect(canAdminPerform('kiosk', 'canAccessAttendanceCheckIn')).toBe(true);
  });

  it('denies access for missing or disabled roles', () => {
    expect(canAdminPerform(null, 'canReadAdminData')).toBe(false);
    expect(canAdminPerform(undefined, 'canReadAdminData')).toBe(false);
    expect(canAdminPerform('kiosk', 'canWriteAdminData')).toBe(false);
    expect(canAdminPerform('kiosk', 'canReadAdminData')).toBe(false);
    expect(canAdminPerform('kiosk', 'canReadAdminMemberData')).toBe(false);
    expect(canAdminPerform('slod', 'canWriteAdminData')).toBe(false);
  });
});
