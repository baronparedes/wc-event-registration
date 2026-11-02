import { describe, expect, it } from 'vitest';

import { ALL_ADMIN_PERMISSION_KEYS, canAdminPerform } from '@/lib/domain/auth/permissions';
import type { AdminAuthState } from '@/lib/domain/auth/types';

describe('canAdminPerform (strict backend permissions)', () => {
  it('exposes all canonical admin permission keys', () => {
    expect(ALL_ADMIN_PERMISSION_KEYS).toEqual([
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
    ]);
  });

  it('evaluates permissions from an authenticated AdminAuthState returned by the backend', () => {
    const backendState: AdminAuthState = {
      isAuthenticated: true,
      session: null,
      adminRole: 'slod',
      permissions: [
        'canReadAdminData',
        'canReadAdminMemberData',
        'canManageAttendanceSavedViews',
        'canExportAdminReports',
        'canViewMemberHistory',
        'canReadDashboard',
        'canManageServices',
      ],
    };

    expect(canAdminPerform(backendState, 'canReadAdminData')).toBe(true);
    expect(canAdminPerform(backendState, 'canExportAdminReports')).toBe(true);
    expect(canAdminPerform(backendState, 'canManageServices')).toBe(true);
    expect(canAdminPerform(backendState, 'canWriteAdminData')).toBe(false);
    expect(canAdminPerform(backendState, 'canManageAdminRoles')).toBe(false);
    expect(canAdminPerform(backendState, ['canWriteAdminData', 'canExportAdminReports'])).toBe(
      true,
    );
    expect(canAdminPerform(backendState, ['canWriteAdminData', 'canManageAdminRoles'])).toBe(false);
  });

  it('evaluates permissions from a permission array or Set directly', () => {
    const permArray = ['canReadAdminMemberData', 'canReadDashboard'] as const;
    const permSet = new Set(permArray);

    expect(canAdminPerform(permArray, 'canReadAdminMemberData')).toBe(true);
    expect(canAdminPerform(permArray, 'canWriteAdminData')).toBe(false);
    expect(canAdminPerform(permSet, 'canReadDashboard')).toBe(true);
    expect(canAdminPerform(permSet, 'canManageServices')).toBe(false);
  });

  it('strictly denies access when unauthenticated or when backend permissions are missing', () => {
    const unauthState: AdminAuthState = {
      isAuthenticated: false,
      session: null,
      adminRole: 'super_admin',
      permissions: ['canManageAdminRoles'],
    };

    const missingPermissionsState: AdminAuthState = {
      isAuthenticated: true,
      session: null,
      adminRole: 'super_admin',
    };

    expect(canAdminPerform(unauthState, 'canManageAdminRoles')).toBe(false);
    expect(canAdminPerform(missingPermissionsState, 'canManageAdminRoles')).toBe(false);
    expect(canAdminPerform(null, 'canReadAdminData')).toBe(false);
    expect(canAdminPerform(undefined, 'canReadAdminData')).toBe(false);
  });
});
