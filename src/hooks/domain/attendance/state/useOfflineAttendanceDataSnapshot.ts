import { useEffect, useMemo, useState } from 'react';

import { useOnlineStatus } from '@/hooks/utils';
import type { AttendanceSettings, AttendeeSearchResult } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import type { AdminEventField } from '@/lib/domain/event-fields';
import type { AdminEvent } from '@/lib/domain/events';
import { type AttendanceDataSnapshot, readAttendanceDataSnapshot } from '@/lib/infrastructure';

type UseOfflineAttendanceDataSnapshotInput = {
  eventId: string | undefined;
  event: AdminEvent | null | undefined;
  settings: AttendanceSettings | undefined;
  attendanceFields: AttendanceField[] | undefined;
  registrationFields: AdminEventField[] | undefined;
  attendees: AttendeeSearchResult[] | null;
};

export function useOfflineAttendanceDataSnapshot({
  eventId,
  event,
  settings,
  attendanceFields,
  registrationFields,
  attendees,
}: UseOfflineAttendanceDataSnapshotInput) {
  const isOnline = useOnlineStatus();
  const hasLiveSource = Boolean(
    event && settings && attendanceFields && registrationFields && attendees,
  );
  const [snapshot, setSnapshot] = useState<AttendanceDataSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(() =>
    Boolean(eventId && !hasLiveSource && !isOnline),
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!eventId) {
      return;
    }

    void readAttendanceDataSnapshot(eventId)
      .then((storedSnapshot) => {
        if (!cancelled) {
          setSnapshot(storedSnapshot);
          setIsLoadingSnapshot(false);
        }
      })
      .catch((snapshotError: unknown) => {
        if (!cancelled) {
          setError(
            snapshotError instanceof Error
              ? snapshotError
              : new Error('Unable to read offline data.'),
          );
          setIsLoadingSnapshot(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const source = useMemo(() => {
    if (!event || !settings || !attendanceFields || !registrationFields || !attendees) {
      return null;
    }

    return { event, settings, attendanceFields, registrationFields, attendees };
  }, [attendanceFields, attendees, event, registrationFields, settings]);

  const resolved = source ?? snapshot;

  return {
    isOnline,
    isUsingSnapshot: !source && Boolean(resolved),
    isLoadingSnapshot,
    error,
    snapshotCreatedAt: snapshot?.createdAt ?? null,
    snapshotExpiresAt: snapshot?.expiresAt ?? null,
    isSnapshotAvailable: Boolean(snapshot),
    event: resolved?.event,
    settings: resolved?.settings,
    attendanceFields: resolved?.attendanceFields,
    registrationFields: resolved?.registrationFields,
    attendees: resolved?.attendees ?? null,
  };
}
