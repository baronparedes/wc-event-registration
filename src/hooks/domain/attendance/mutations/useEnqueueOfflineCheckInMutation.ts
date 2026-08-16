import { useMutation } from '@tanstack/react-query';

import type { AttendeeSearchResult, CheckInAttendeeInput } from '@/lib/domain/attendance';
import {
  type OfflineAttendanceOwner,
  type QueuedOfflineCheckIn,
  enqueueOfflineCheckIn,
} from '@/lib/infrastructure';

type EnqueueOfflineCheckInInput = {
  owner: OfflineAttendanceOwner;
  payload: CheckInAttendeeInput;
  registrationId: string;
  attendees: AttendeeSearchResult[];
};

function createQueueItem({
  owner,
  payload,
  registrationId,
}: Omit<EnqueueOfflineCheckInInput, 'attendees'>): QueuedOfflineCheckIn {
  const now = Date.now();

  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `offline-check-in-${now}-${Math.random().toString(36).slice(2)}`,
    eventId: payload.event_id,
    ownerUserId: owner.userId,
    payload,
    registrationId,
    optimisticCheckedInAt: new Date(now).toISOString(),
    createdAt: now,
    attempts: 0,
    nextAttemptAt: now,
    status: 'pending',
    sendingAt: null,
    lastError: null,
  };
}

export function useEnqueueOfflineCheckInMutation() {
  return useMutation({
    mutationFn: async ({
      owner,
      payload,
      registrationId,
      attendees,
    }: EnqueueOfflineCheckInInput) => {
      const item = createQueueItem({ owner, payload, registrationId });
      const updatedAttendees = attendees.map((attendee) =>
        attendee.registration_id === registrationId
          ? {
              ...attendee,
              check_in_status: 'checked_in' as const,
              official_check_in_time: item.optimisticCheckedInAt,
            }
          : attendee,
      );

      await enqueueOfflineCheckIn(item, updatedAttendees);

      return item;
    },
  });
}
