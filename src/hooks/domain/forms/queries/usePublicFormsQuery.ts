import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { supabase } from '@/lib/infrastructure';

export const PUBLIC_FORMS_QUERY_KEY = ['public-forms'] as const;

export function usePublicFormsQuery() {
  return useQuery<AdminForm[], Error>({
    queryKey: PUBLIC_FORMS_QUERY_KEY,
    queryFn: async (): Promise<AdminForm[]> => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as AdminForm[];
    },
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
