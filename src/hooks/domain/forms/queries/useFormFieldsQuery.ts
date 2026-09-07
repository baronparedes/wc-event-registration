import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { FormField } from '@/lib/domain/forms';
import { supabase } from '@/lib/infrastructure';

export function formFieldsQueryKey(formId: string, includeInactive = false) {
  return ['form-fields', formId, includeInactive] as const;
}

export function useFormFieldsQuery(formId?: string, includeInactive = false) {
  return useQuery<FormField[], Error>({
    queryKey: formFieldsQueryKey(formId ?? '', includeInactive),
    enabled: Boolean(formId),
    queryFn: async (): Promise<FormField[]> => {
      if (!formId) return [];

      let query = supabase.from('form_fields').select('*').eq('form_id', formId);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order('display_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as FormField[];
    },
    staleTime: QUERY_STALE_TIME_MS.standard,
  });
}
