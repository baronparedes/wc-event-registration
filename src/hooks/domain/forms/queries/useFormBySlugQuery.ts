import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { supabase } from '@/lib/infrastructure';

export function formBySlugQueryKey(slug: string) {
  return ['form-by-slug', slug] as const;
}

export function useFormBySlugQuery(slug?: string) {
  return useQuery<AdminForm | null, Error>({
    queryKey: formBySlugQueryKey(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: async (): Promise<AdminForm | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      return data as AdminForm | null;
    },
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
