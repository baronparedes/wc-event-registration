import { useQuery } from '@tanstack/react-query';

import { type ServiceLayout, fetchServiceLayouts } from '@/lib/domain/services';

export const SERVICE_LAYOUTS_QUERY_KEY = ['service-layouts'] as const;

export function useServiceLayoutsQuery() {
  return useQuery({
    queryKey: SERVICE_LAYOUTS_QUERY_KEY,
    queryFn: async (): Promise<ServiceLayout[]> => {
      return fetchServiceLayouts();
    },
  });
}
