import { useQuery } from '@tanstack/react-query';

import type { ServiceExceptionDate } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export const SERVICE_EXCEPTION_DATES_QUERY_KEY = ['service_exception_dates'] as const;

export function useServiceExceptionDatesQuery() {
  return useQuery({
    queryKey: SERVICE_EXCEPTION_DATES_QUERY_KEY,
    queryFn: async (): Promise<ServiceExceptionDate[]> => {
      const { data, error } = await supabase
        .from('service_exception_dates')
        .select('*')
        .order('exception_date', { ascending: true });

      if (error) throw error;
      return (data as unknown as ServiceExceptionDate[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
