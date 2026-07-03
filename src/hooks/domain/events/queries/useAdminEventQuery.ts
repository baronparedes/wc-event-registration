import { useQuery } from '@tanstack/react-query';

import type { AdminEvent } from '@/lib/domain/events';
import { supabase } from '@/lib/infrastructure';

export const adminEventQueryKey = (id: string) => ['admin-event', id] as const;

/** Fetches a single event by ID for the admin edit form. Only runs when id is defined. */
export function useAdminEventQuery(id: string | undefined) {
  return useQuery({
    queryKey: id ? adminEventQueryKey(id) : ['admin-event', ''],
    queryFn: async (): Promise<AdminEvent | null> => {
      if (!id) return null;
      const { data, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle();

      if (error) throw error;
      return data as AdminEvent | null;
    },
    enabled: !!id,
  });
}
