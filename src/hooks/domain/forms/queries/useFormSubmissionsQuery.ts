import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchFormIdBySlug, fetchFormSubmissions } from '@/lib/domain/forms';
import type { FormSubmission } from '@/lib/domain/forms';

export function formSubmissionsQueryKey(formId: string) {
  return ['form-submissions', formId] as const;
}

export function useFormSubmissionsQuery(formId?: string) {
  return useQuery<FormSubmission[], Error>({
    queryKey: formSubmissionsQueryKey(formId ?? ''),
    enabled: Boolean(formId),
    queryFn: async (): Promise<FormSubmission[]> => {
      if (!formId) return [];
      const trimmed = formId.trim();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

      let targetFormId = trimmed;
      if (!isUuid) {
        const formRecordId = await fetchFormIdBySlug(trimmed);

        if (!formRecordId) return [];
        targetFormId = formRecordId;
      }

      return fetchFormSubmissions(targetFormId);
    },
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
