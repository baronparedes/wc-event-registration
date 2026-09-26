import { useQuery } from '@tanstack/react-query';

import { type ServiceLayout, fetchActiveServiceLayout } from '@/lib/domain/services';

export const ACTIVE_SERVICE_LAYOUT_QUERY_KEY = ['active-service-layout'] as const;

export function useActiveServiceLayoutQuery() {
  return useQuery({
    queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY,
    queryFn: async (): Promise<ServiceLayout | null> => {
      return fetchActiveServiceLayout();
    },
  });
}
