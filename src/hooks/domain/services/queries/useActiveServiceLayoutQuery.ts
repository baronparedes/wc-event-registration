import { useQuery } from '@tanstack/react-query';

import type { ServiceLayout } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export const ACTIVE_SERVICE_LAYOUT_QUERY_KEY = ['active-service-layout'] as const;

export function useActiveServiceLayoutQuery() {
  return useQuery({
    queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY,
    queryFn: async (): Promise<ServiceLayout | null> => {
      const { data, error } = await supabase
        .from('service_layouts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch active service layout: ${error.message}`);
      }

      return data as ServiceLayout | null;
    },
  });
}
