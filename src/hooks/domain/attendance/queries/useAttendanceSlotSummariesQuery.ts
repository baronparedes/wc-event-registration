/* c8 ignore start */
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type AttendanceSlotAttendee,
  type AttendanceSlotSummary,
  fetchAttendanceCheckInsByIds,
  fetchAttendancePublicRegistrationProfiles,
  fetchAttendanceRegistrationUsers,
  fetchAttendanceSlotRecords,
  fetchAttendanceUserProfiles,
} from '@/lib/domain/attendance';

/**
 * Loads slot-level attendance summaries for timeslot-enabled events.
 */
export function useAttendanceSlotSummariesQuery(eventId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSlotSummaries(eventId),
    queryFn: async (): Promise<AttendanceSlotSummary[]> => {
      if (!eventId) return [];

      const slotRecords = await fetchAttendanceSlotRecords(eventId);

      if (!slotRecords || slotRecords.length === 0) return [];

      const checkInIds = [...new Set(slotRecords.map((record) => record.check_in_id))];

      const checkInRows = await fetchAttendanceCheckInsByIds(checkInIds);
      const checkInById = new Map(checkInRows.map((row) => [row.id, row]));

      const registrationIds = checkInRows
        .map((row) => row.registration_id)
        .filter((id): id is string => Boolean(id));
      const publicRegistrationIds = checkInRows
        .map((row) => row.public_registration_id)
        .filter((id): id is string => Boolean(id));

      const registrationRows = registrationIds.length
        ? await fetchAttendanceRegistrationUsers(registrationIds)
        : [];
      const userIds = registrationRows
        .map((row) => row.user_id)
        .filter((id): id is string => Boolean(id));

      const users = userIds.length ? await fetchAttendanceUserProfiles(userIds) : [];

      const publicRegistrations = publicRegistrationIds.length
        ? await fetchAttendancePublicRegistrationProfiles(publicRegistrationIds)
        : [];

      const registrationById = new Map(
        registrationRows
          .filter((row) => Boolean(row.id) && Boolean(row.user_id))
          .map((row) => [row.id as string, row.user_id as string]),
      );

      const userById = new Map(
        users.map((user) => [
          user.id as string,
          {
            full_name: (user.full_name as string) ?? 'Unknown attendee',
            member_id: (user.member_id as string | null) ?? null,
            email: (user.email as string | null) ?? null,
          },
        ]),
      );

      const publicRegistrationById = new Map(
        publicRegistrations.map((registration) => {
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

      for (const record of slotRecords) {
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
