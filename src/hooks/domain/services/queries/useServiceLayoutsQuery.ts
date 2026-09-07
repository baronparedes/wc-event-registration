import { useQuery } from '@tanstack/react-query';

import type { ServiceLayout } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export const SERVICE_LAYOUTS_QUERY_KEY = ['service-layouts'] as const;

export function useServiceLayoutsQuery() {
  return useQuery({
    queryKey: SERVICE_LAYOUTS_QUERY_KEY,
    queryFn: async (): Promise<ServiceLayout[]> => {
      const { data, error } = await supabase
        .from('service_layouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch service layouts: ${error.message}`);
      }

      return (data as ServiceLayout[]) ?? [];
    },
  });
}
