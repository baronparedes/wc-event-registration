/* c8 ignore start */
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceSlotAttendee, AttendanceSlotSummary } from '@/lib/domain/attendance';
import { supabase } from '@/lib/infrastructure';

type SlotRecordRow = {
  check_in_id: string;
  slot: string;
  recorded_at: string;
};

type CheckInRow = {
  id: string;
  attendee_kind: 'registered' | 'public';
  registration_id: string | null;
  public_registration_id: string | null;
  first_checked_in_at: string | null;
};

/**
 * Loads slot-level attendance summaries for timeslot-enabled events.
 */
export function useAttendanceSlotSummariesQuery(eventId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSlotSummaries(eventId),
    queryFn: async (): Promise<AttendanceSlotSummary[]> => {
      if (!eventId) return [];

      const { data: slotRecords, error: slotRecordsError } = await supabase
        .from('attendance_slot_records')
        .select('check_in_id, slot, recorded_at')
        .eq('event_id', eventId)
        .order('recorded_at', { ascending: true });

      if (slotRecordsError) throw slotRecordsError;
      if (!slotRecords || slotRecords.length === 0) return [];

      const checkInIds = [...new Set(slotRecords.map((record) => record.check_in_id))];

      const { data: checkIns, error: checkInsError } = await supabase
        .from('attendance_check_ins')
        .select('id, attendee_kind, registration_id, public_registration_id, first_checked_in_at')
        .in('id', checkInIds);

      if (checkInsError) throw checkInsError;

      const checkInRows = (checkIns ?? []) as CheckInRow[];
      const checkInById = new Map(checkInRows.map((row) => [row.id, row]));

      const registrationIds = checkInRows
        .map((row) => row.registration_id)
        .filter((id): id is string => Boolean(id));
      const publicRegistrationIds = checkInRows
        .map((row) => row.public_registration_id)
        .filter((id): id is string => Boolean(id));

      const registrations = registrationIds.length
        ? await supabase.from('registrations').select('id, user_id').in('id', registrationIds)
        : { data: [], error: null };

      if (registrations.error) throw registrations.error;

      const registrationRows = registrations.data ?? [];
      const userIds = registrationRows
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id));

      const users = userIds.length
        ? await supabase.from('users').select('id, member_id, full_name, email').in('id', userIds)
        : { data: [], error: null };

      if (users.error) throw users.error;

      const publicRegistrations = publicRegistrationIds.length
        ? await supabase
            .from('public_registrations')
            .select('id, first_name, last_name, email')
            .in('id', publicRegistrationIds)
        : { data: [], error: null };

      if (publicRegistrations.error) throw publicRegistrations.error;

      const registrationById = new Map(
        registrationRows
          .filter((row) => Boolean(row.id) && Boolean(row.user_id))
          .map((row) => [row.id as string, row.user_id as string]),
      );

      const userById = new Map(
        (users.data ?? []).map((user) => [
          user.id as string,
          {
            full_name: (user.full_name as string) ?? 'Unknown attendee',
            member_id: (user.member_id as string | null) ?? null,
            email: (user.email as string | null) ?? null,
          },
        ]),
      );

      const publicRegistrationById = new Map(
        (publicRegistrations.data ?? []).map((registration) => {
          const firstName = String(registration.first_name ?? '').trim();
          const lastName = String(registration.last_name ?? '').trim();
          const fullName = `${firstName} ${lastName}`.trim() || 'Guest attendee';

          return [
            registration.id as string,
            {
              full_name: fullName,
              member_id: null,
              email: (registration.email as string | null) ?? null,
            },
          ];
        }),
      );

      const attendeesBySlot = new Map<string, AttendanceSlotAttendee[]>();

      for (const record of slotRecords as SlotRecordRow[]) {
        const checkIn = checkInById.get(record.check_in_id);
        if (!checkIn) continue;

        const attendeeProfile =
          checkIn.attendee_kind === 'registered'
            ? (() => {
                if (!checkIn.registration_id) return null;
                const userId = registrationById.get(checkIn.registration_id);
                if (!userId) return null;
                return userById.get(userId) ?? null;
              })()
            : checkIn.public_registration_id
              ? (publicRegistrationById.get(checkIn.public_registration_id) ?? null)
              : null;

        if (!attendeeProfile) continue;

        const attendee: AttendanceSlotAttendee = {
          check_in_id: checkIn.id,
          attendee_kind: checkIn.attendee_kind,
          registration_id: checkIn.registration_id,
          public_registration_id: checkIn.public_registration_id,
          full_name: attendeeProfile.full_name,
          member_id: attendeeProfile.member_id,
          email: attendeeProfile.email,
          official_check_in_time: checkIn.first_checked_in_at,
          recorded_at: record.recorded_at,
        };

        const current = attendeesBySlot.get(record.slot) ?? [];
        current.push(attendee);
        attendeesBySlot.set(record.slot, current);
      }

      const summaries = Array.from(attendeesBySlot.entries()).map(([slot, attendees]) => ({
        slot,
        count: attendees.length,
        attendees: attendees.sort((a, b) => a.full_name.localeCompare(b.full_name)),
      }));

      return summaries.sort((a, b) => {
        const aTime = Date.parse(a.slot);
        const bTime = Date.parse(b.slot);

        if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
          return aTime - bTime;
        }

        return a.slot.localeCompare(b.slot);
      });
    },
    enabled: Boolean(eventId) && enabled,
  });
}
/* c8 ignore stop */
