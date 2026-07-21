import type { AdminRole } from './types';

export function canWriteAdminData(role: AdminRole | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function canReadAdminData(role: AdminRole | null | undefined): boolean {
  return role != null;
}

export function canManageAttendanceSavedViews(role: AdminRole | null | undefined): boolean {
  return role != null;
}

export function canExportAdminReports(role: AdminRole | null | undefined): boolean {
  return role != null;
}
