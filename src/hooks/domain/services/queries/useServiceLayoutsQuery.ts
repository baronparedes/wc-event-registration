import { useQuery } from '@tanstack/react-query';

import { fetchActiveServiceLayout, fetchServiceLayouts } from '@/lib/infrastructure/servicesData';

export const SERVICE_LAYOUTS_QUERY_KEY = ['service-layouts'] as const;
export const ACTIVE_SERVICE_LAYOUT_QUERY_KEY = ['active-service-layout'] as const;

export function useServiceLayoutsQuery() {
  return useQuery({
    queryKey: SERVICE_LAYOUTS_QUERY_KEY,
    queryFn: fetchServiceLayouts,
  });
}

export function useActiveServiceLayoutQuery() {
  return useQuery({
    queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY,
    queryFn: fetchActiveServiceLayout,
  });
}
