import { useQuery } from '@tanstack/react-query';

import type { ServiceSeat } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export const serviceSeatsQueryKey = (layoutId: string) => ['service-seats', layoutId] as const;

export function useServiceSeatsQuery(layoutId: string | null | undefined) {
  return useQuery({
    queryKey: serviceSeatsQueryKey(layoutId ?? ''),
    queryFn: async (): Promise<ServiceSeat[]> => {
      if (!layoutId) return [];

      const { data, error } = await supabase
        .from('service_seats')
        .select('*')
        .eq('layout_id', layoutId)
        .order('table_number', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch service seats: ${error.message}`);
      }

      return (data as ServiceSeat[]) ?? [];
    },
    enabled: Boolean(layoutId),
  });
}
