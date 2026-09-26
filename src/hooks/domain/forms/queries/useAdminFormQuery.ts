import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchAdminFormById, fetchAdminFormBySlug } from '@/lib/domain/forms';
import type { AdminForm } from '@/lib/domain/forms';

export function adminFormQueryKey(formId: string) {
  return ['admin-form', formId] as const;
}

export function useAdminFormQuery(formId?: string) {
  return useQuery<AdminForm | null, Error>({
    queryKey: adminFormQueryKey(formId ?? ''),
    enabled: Boolean(formId),
    queryFn: async (): Promise<AdminForm | null> => {
      if (!formId) return null;
      const trimmed = formId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

      return isUuid ? fetchAdminFormById(trimmed) : fetchAdminFormBySlug(trimmed);
    },
    staleTime: QUERY_STALE_TIME_MS.detail,
  });
}
