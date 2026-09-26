import { useQuery } from '@tanstack/react-query';

import { type ServiceExceptionDate, fetchServiceExceptionDates } from '@/lib/domain/services';

export const SERVICE_EXCEPTION_DATES_QUERY_KEY = ['service_exception_dates'] as const;

export function useServiceExceptionDatesQuery() {
  return useQuery({
    queryKey: SERVICE_EXCEPTION_DATES_QUERY_KEY,
    queryFn: async (): Promise<ServiceExceptionDate[]> => {
      return fetchServiceExceptionDates();
    },
    staleTime: 5 * 60 * 1000,
  });
}
