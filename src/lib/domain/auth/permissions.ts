import { ALL_ADMIN_PERMISSION_KEYS, type AdminAuthState, type AdminPermissionKey } from './types';

export { ALL_ADMIN_PERMISSION_KEYS };
export type { AdminPermissionKey };

export type AdminPermissionSubject =
  | AdminAuthState
  | readonly AdminPermissionKey[]
  | ReadonlySet<AdminPermissionKey>
  | null
  | undefined;

function hasSinglePermission(
  subject: AdminPermissionSubject,
  permission: AdminPermissionKey,
): boolean {
  if (!subject) return false;

  if (subject instanceof Set) {
    return subject.has(permission);
  }

  if (Array.isArray(subject)) {
    return subject.includes(permission);
  }

  if (typeof subject === 'object' && 'isAuthenticated' in subject) {
    if (!subject.isAuthenticated || !Array.isArray(subject.permissions)) {
      return false;
    }
    return subject.permissions.includes(permission);
  }

  return false;
}

export function canAdminPerform(
  subject: AdminPermissionSubject,
  permission: AdminPermissionKey | readonly AdminPermissionKey[],
): boolean {
  if (Array.isArray(permission)) {
    return permission.some((perm) => hasSinglePermission(subject, perm));
  }
  return hasSinglePermission(subject, permission as AdminPermissionKey);
}
