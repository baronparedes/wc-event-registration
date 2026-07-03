import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceSettings } from '@/lib/domain/attendance';
import { supabase } from '@/lib/infrastructure';

function buildDefaultSettings(eventId: string): AttendanceSettings {
  return {
    event_id: eventId,
    attendance_enabled: false,
    walk_in_mode_enabled: false,
    timeslot_enabled: false,
    timeslots: [],
    updated_at: new Date().toISOString(),
  };
}

/** Fetches attendance settings for an event, returning defaults if no row exists yet. */
export function useAttendanceSettingsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSettings(eventId),
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!eventId) {
        throw new Error('Event ID is required to load attendance settings.');
      }

      const { data, error } = await supabase
        .from('attendance_settings')
        .select(
          'event_id, attendance_enabled, walk_in_mode_enabled, timeslot_enabled, timeslots, updated_at',
        )
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      return (data as AttendanceSettings | null) ?? buildDefaultSettings(eventId);
    },
    enabled: Boolean(eventId),
  });
}
