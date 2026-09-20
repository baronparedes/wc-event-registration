/**
 * Shared utility functions for volunteer role normalization and matching across chat tools.
 */

export function isSpecificRole(role?: string): boolean {
  if (!role) return false;
  const trimmed = role.trim().toLowerCase();
  return (
    trimmed.length > 0 &&
    !['volunteer', 'volunteers', 'all', 'any', 'member', 'members'].includes(trimmed)
  );
}

export function getPrimaryRole(role?: string | null): string {
  if (!role) return 'Unspecified';
  const primary = role.split('/')[0]?.trim();
  return primary || 'Unspecified';
}

export function matchesPrimaryRole(userRole?: string | null, targetRole?: string): boolean {
  if (!isSpecificRole(targetRole)) return true;
  const primary = getPrimaryRole(userRole).toLowerCase();
  const target = getPrimaryRole(targetRole).toLowerCase();
  return primary.includes(target);
}
