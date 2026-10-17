import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type ServiceExcuseRequest, fetchMemberServiceExcuses } from '@/lib/domain/services';

export function useMemberServiceExcusesQuery(
  userId: string,
  startDate?: string,
  endDate?: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['service-excuse-requests', userId, startDate ?? 'all', endDate ?? 'all'],
    queryFn: async (): Promise<ServiceExcuseRequest[]> => {
      return fetchMemberServiceExcuses(userId, startDate, endDate);
    },
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? Boolean(userId),
  });
}
