import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchFormFields } from '@/lib/domain/forms';
import type { FormField } from '@/lib/domain/forms';

export function formFieldsQueryKey(formId: string, includeInactive = false) {
  return ['form-fields', formId, includeInactive] as const;
}

export function useFormFieldsQuery(formId?: string, includeInactive = false) {
  return useQuery<FormField[], Error>({
    queryKey: formFieldsQueryKey(formId ?? '', includeInactive),
    enabled: Boolean(formId),
    queryFn: async (): Promise<FormField[]> => {
      if (!formId) return [];

      return fetchFormFields(formId, includeInactive);
    },
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
