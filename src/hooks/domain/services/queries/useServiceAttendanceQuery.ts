import { keepPreviousData, useQuery } from '@tanstack/react-query';

import type { ServiceAttendance } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export interface FetchServiceAttendanceFilters {
  service_date?: string;
  time_slot?: string;
  user_id?: string;
  rfid?: string;
  start_date?: string;
  end_date?: string;
}

export const serviceAttendanceQueryKey = (filters: FetchServiceAttendanceFilters) =>
  ['service-attendance', filters] as const;

export function useServiceAttendanceQuery(filters: FetchServiceAttendanceFilters = {}) {
  return useQuery({
    queryKey: serviceAttendanceQueryKey(filters),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<ServiceAttendance[]> => {
      let query = supabase
        .from('service_attendance')
        .select('*')
        .order('checked_in_at', { ascending: false });

      if (filters.service_date) {
        query = query.eq('service_date', filters.service_date);
      }
      if (filters.start_date) {
        query = query.gte('service_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('service_date', filters.end_date);
      }
      if (filters.time_slot) {
        query = query.eq('time_slot', filters.time_slot);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.rfid) {
        query = query.eq('rfid', filters.rfid);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch service attendance: ${error.message}`);
      }

      return (data as ServiceAttendance[]) ?? [];
    },
  });
}
