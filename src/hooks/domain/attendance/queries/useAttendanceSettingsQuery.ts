/* c8 ignore start */
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceSettings } from '@/lib/domain/attendance';
import { supabase } from '@/lib/infrastructure';

function buildDefaultSettings(eventId: string): AttendanceSettings {
  return {
    event_id: eventId,
    attendance_enabled: false,
    offline_check_in_queue_enabled: false,
    timeslot_enabled: false,
    enforce_check_in_event_window: true,
    timeslots: [],
    updated_at: new Date().toISOString(),
  };
}

/** Fetches attendance settings for an event, returning defaults if no row exists yet. */
export function useAttendanceSettingsQuery(eventId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSettings(eventId),
    queryFn: async (): Promise<AttendanceSettings> => {
      if (!eventId) {
        throw new Error('Event ID is required to load attendance settings.');
      }

      const { data, error } = await supabase
        .from('attendance_settings')
        .select(
          'event_id, attendance_enabled, offline_check_in_queue_enabled, timeslot_enabled, enforce_check_in_event_window, timeslots, updated_at',
        )
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) throw error;
      return (data as AttendanceSettings | null) ?? buildDefaultSettings(eventId);
    },
    enabled: Boolean(eventId) && enabled,
  });
}
/* c8 ignore stop */
