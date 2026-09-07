import { useQuery } from '@tanstack/react-query';

import { fetchServiceSeats } from '@/lib/infrastructure/servicesData';

export const serviceSeatsQueryKey = (layoutId: string) => ['service-seats', layoutId] as const;

export function useServiceSeatsQuery(layoutId: string | null | undefined) {
  return useQuery({
    queryKey: serviceSeatsQueryKey(layoutId ?? ''),
    queryFn: () => (layoutId ? fetchServiceSeats(layoutId) : Promise.resolve([])),
    enabled: Boolean(layoutId),
  });
}
