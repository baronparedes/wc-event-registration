import { useCallback, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  ADMIN_AUTH_QUERY_KEY,
  type AdminAuthState,
  type AdminPermissionKey,
  canAdminPerform,
  fetchAdminAuthState,
} from '@/lib/domain/auth';

export function useAdminAuthQuery(enabled = true) {
  const query = useQuery<AdminAuthState>({
    queryKey: ADMIN_AUTH_QUERY_KEY,
    queryFn: fetchAdminAuthState,
    staleTime: QUERY_STALE_TIME_MS.detail,
    enabled,
  });

  const permissionSet = useMemo<ReadonlySet<AdminPermissionKey>>(
    () =>
      query.data?.isAuthenticated && Array.isArray(query.data.permissions)
        ? new Set(query.data.permissions)
        : new Set(),
    [query.data],
  );

  const can = useCallback(
    (requiredPermission: AdminPermissionKey | readonly AdminPermissionKey[]) =>
      canAdminPerform(permissionSet, requiredPermission),
    [permissionSet],
  );

  return {
    ...query,
    can,
  };
}
