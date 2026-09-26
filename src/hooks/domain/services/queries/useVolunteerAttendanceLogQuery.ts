import { useQuery } from '@tanstack/react-query';

import { fetchVolunteerAttendanceLog } from '@/lib/domain/services';

export interface VolunteerAttendanceLogFilters {
  user_id: string;
  start_date: string;
  end_date: string;
  excuse_event_id?: string | null;
}

export interface VolunteerAttendanceLogRecord {
  id: string | null;
  service_date: string;
  time_slot: string;
  is_walk_in: boolean;
  is_override: boolean;
  is_manual_entry: boolean;
  status: 'present' | 'absent' | 'excused';
  checked_in_at?: string | null;
}

export const volunteerAttendanceLogQueryKey = (filters: VolunteerAttendanceLogFilters) =>
  ['volunteer-attendance-log', filters] as const;

export function useVolunteerAttendanceLogQuery(filters: VolunteerAttendanceLogFilters) {
  return useQuery({
    queryKey: volunteerAttendanceLogQueryKey(filters),
    enabled: Boolean(filters.user_id && filters.start_date && filters.end_date),
    queryFn: async () => {
      const data = await fetchVolunteerAttendanceLog(filters);

      return data as VolunteerAttendanceLogRecord[];
    },
  });
}
