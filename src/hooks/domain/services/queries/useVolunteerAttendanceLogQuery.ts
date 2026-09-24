import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export interface VolunteerAttendanceLogFilters {
  user_id: string;
  start_date: string;
  end_date: string;
}

export interface VolunteerAttendanceLogRecord {
  id: string;
  service_date: string;
  time_slot: string;
  is_walk_in: boolean;
  is_override: boolean;
  is_manual_entry: boolean;
}

export const volunteerAttendanceLogQueryKey = (filters: VolunteerAttendanceLogFilters) =>
  ['volunteer-attendance-log', filters] as const;

export function useVolunteerAttendanceLogQuery(filters: VolunteerAttendanceLogFilters) {
  return useQuery({
    queryKey: volunteerAttendanceLogQueryKey(filters),
    enabled: Boolean(filters.user_id && filters.start_date && filters.end_date),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_volunteer_attendance_log', {
        p_user_id: filters.user_id,
        p_start_date: filters.start_date,
        p_end_date: filters.end_date,
      });

      if (error) {
        throw new Error(`Failed to fetch volunteer attendance log: ${error.message}`);
      }

      return (data || []) as VolunteerAttendanceLogRecord[];
    },
  });
}
