/* c8 ignore start */
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type AttendanceSettings,
  fetchAttendanceSettings,
  normalizeAttendanceTimeslots,
} from '@/lib/domain/attendance';

function buildDefaultSettings(eventId: string): AttendanceSettings {
  return {
    event_id: eventId,
    attendance_enabled: false,
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

      const data = await fetchAttendanceSettings(eventId);

      if (!data) {
        return buildDefaultSettings(eventId);
      }

      return {
        ...(data as AttendanceSettings),
        timeslots: normalizeAttendanceTimeslots(data.timeslots),
      };
    },
    enabled: Boolean(eventId) && enabled,
  });
}
/* c8 ignore stop */
