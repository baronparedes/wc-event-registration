import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AttendeeSearchResult,
  CheckInAttendeeInput,
  CheckInResult,
} from '@/lib/domain/attendance';
import {
  type OfflineAttendanceOwner,
  acknowledgeOfflineCheckIn,
  claimNextOfflineCheckIn,
  createEdgeFunctionCaller,
  markOfflineCheckInFailed,
  markOfflineCheckInForRetry,
  readPreparedOfflineAttendanceEvent,
} from '@/lib/infrastructure';

type CheckInSuccess = { success: true; result: CheckInResult };
type CheckInError = { success: false; error: string };

const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30_000;

function isRetryable(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!(error instanceof Error)) return true;

  const message = error.message.toLowerCase();
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
    return true;
  }

  const status = Number(message.match(/edge function failed:\s*(\d{3})/i)?.[1]);
  return !Number.isFinite(status) || status >= 500 || status === 429;
}

function retryDelay(attempts: number): number {
  return Math.min(
    RETRY_BASE_DELAY_MS * 2 ** Math.min(Math.max(attempts - 1, 0), 5),
    RETRY_MAX_DELAY_MS,
  );
}

function applyServerCheckIn(
  attendees: AttendeeSearchResult[],
  registrationId: string,
  officialCheckInTime: string | null,
): AttendeeSearchResult[] {
  return attendees.map((attendee) =>
    attendee.registration_id === registrationId
      ? {
          ...attendee,
          check_in_status: 'checked_in',
          official_check_in_time: officialCheckInTime,
        }
      : attendee,
  );
}

export function useOfflineCheckInOutboxReplay(
  eventId: string | undefined,
  owner: OfflineAttendanceOwner | null,
  enabled: boolean,
  onSynced: () => void,
) {
  const isDrainingRef = useRef(false);
  const [isDraining, setIsDraining] = useState(false);

  const drain = useCallback(async () => {
    if (!eventId || !owner || !enabled || isDrainingRef.current || !navigator.onLine) return;

    const caller = createEdgeFunctionCaller<CheckInAttendeeInput, CheckInSuccess | CheckInError>(
      'check-in-attendee',
    );
    isDrainingRef.current = true;
    setIsDraining(true);

    try {
      while (true) {
        const item = await claimNextOfflineCheckIn(eventId, owner);
        if (!item) return;

        try {
          const response = await caller(item.payload);
          if (!response.success || response.result.status === 'rejected') {
            throw new Error(response.success ? response.result.message : response.error);
          }

          const preparedEvent = await readPreparedOfflineAttendanceEvent(eventId, owner);
          if (!preparedEvent) return;

          await acknowledgeOfflineCheckIn(
            item,
            owner,
            applyServerCheckIn(
              preparedEvent.attendees,
              item.registrationId,
              response.result.official_check_in_time,
            ),
          );
          onSynced();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to sync check-in.';
          if (isRetryable(error)) {
            await markOfflineCheckInForRetry(item, Date.now() + retryDelay(item.attempts), message);
            return;
          }

          await markOfflineCheckInFailed(item, message);
          onSynced();
        }
      }
    } finally {
      isDrainingRef.current = false;
      setIsDraining(false);
    }
  }, [enabled, eventId, onSynced, owner]);

  useEffect(() => {
    if (!enabled) return;
    void drain();
    const intervalId = window.setInterval(() => void drain(), 1000);
    const handleOnline = () => void drain();
    window.addEventListener('online', handleOnline);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
    };
  }, [drain, enabled]);

  return { isDraining, drain };
}
