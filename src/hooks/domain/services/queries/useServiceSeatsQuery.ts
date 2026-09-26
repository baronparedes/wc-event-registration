import { useQuery } from '@tanstack/react-query';

import { type ServiceSeat, fetchServiceSeats } from '@/lib/domain/services';

export const serviceSeatsQueryKey = (layoutId: string) => ['service-seats', layoutId] as const;

export function useServiceSeatsQuery(layoutId: string | null | undefined) {
  return useQuery({
    queryKey: serviceSeatsQueryKey(layoutId ?? ''),
    queryFn: async (): Promise<ServiceSeat[]> => {
      if (!layoutId) return [];

      return fetchServiceSeats(layoutId);
    },
    enabled: Boolean(layoutId),
  });
}
