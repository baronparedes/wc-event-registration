import type { AdminRole } from './types';

export function canWriteAdminData(role: AdminRole | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canReadAdminData(role: AdminRole | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'slod';
}

export function canManageAttendanceSavedViews(role: AdminRole | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'slod';
}

export function canExportAdminReports(role: AdminRole | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'slod';
}

export function canAccessAttendanceCheckIn(role: AdminRole | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'kiosk';
}
