import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { supabase } from '@/lib/infrastructure';

export function adminFormQueryKey(formId: string) {
  return ['admin-form', formId] as const;
}

export function useAdminFormQuery(formId?: string) {
  return useQuery<AdminForm | null, Error>({
    queryKey: adminFormQueryKey(formId ?? ''),
    enabled: Boolean(formId),
    queryFn: async (): Promise<AdminForm | null> => {
      if (!formId) return null;
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .maybeSingle();

      if (error) throw error;
      return data as AdminForm | null;
    },
    staleTime: QUERY_STALE_TIME_MS.immediate,
  });
}
