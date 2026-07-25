import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { useLocalStorage } from '@/hooks/utils';
import type {
  AttendeeSearchResult,
  CheckInAttendeeInput,
  CheckInResult,
} from '@/lib/domain/attendance';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type CheckInAttendeeSuccess = {
  success: true;
  result: CheckInResult;
};

type CheckInAttendeeError = {
  success: false;
  error: string;
  error_code?: string;
  detail?: string;
};

type QueuedCheckInStatus = 'pending' | 'sending' | 'failed';

type QueuedCheckInItem = {
  id: string;
  payload: CheckInAttendeeInput;
  registrationId: string;
  optimisticCheckedInAt: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  status: QueuedCheckInStatus;
  lastError: string | null;
};

type QueueOutcome = {
  queued: boolean;
  item: QueuedCheckInItem;
};

type UseQueuedCheckInAttendeeMutationOptions = {
  updateAttendee: (registrationId: string, updates: Partial<AttendeeSearchResult>) => void;
  refreshCache: () => void;
};

const QUEUE_RETRY_BASE_DELAY_MS = 1000;
const QUEUE_RETRY_MAX_DELAY_MS = 30_000;

function getQueueStorageKey(eventId: string | undefined): string | null {
  return eventId ? `wc:attendance:check-in-queue:${eventId}` : null;
}

function generateQueueItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `queued-check-in-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createQueuedCheckInItem(
  payload: CheckInAttendeeInput,
  registrationId: string,
): QueuedCheckInItem {
  const optimisticCheckedInAt = new Date().toISOString();

  return {
    id: generateQueueItemId(),
    payload,
    registrationId,
    optimisticCheckedInAt,
    createdAt: Date.now(),
    attempts: 0,
    nextAttemptAt: Date.now(),
    status: 'pending',
    lastError: null,
  };
}

function getCheckInErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Failed to check in attendee.';
}

function isRetryableCheckInError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();

  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('timeout')
  ) {
    return true;
  }

  const statusMatch = message.match(/edge function failed:\s*(\d{3})/i);
  if (statusMatch) {
    const status = Number(statusMatch[1]);
    return status >= 500 || status === 429;
  }

  return !(
    message.includes('bad request') ||
    message.includes('unprocessable') ||
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('forbidden') ||
    message.includes('unauthorized') ||
    message.includes('not found') ||
    message.includes('conflict')
  );
}

function getRetryDelayMs(attempts: number): number {
  const exponent = Math.min(Math.max(attempts - 1, 0), 5);
  return Math.min(QUEUE_RETRY_BASE_DELAY_MS * 2 ** exponent, QUEUE_RETRY_MAX_DELAY_MS);
}

function getDedupeKey(payload: CheckInAttendeeInput): string {
  return [
    payload.event_id,
    payload.attendee_kind,
    payload.registration_id ?? '',
    payload.public_registration_id ?? '',
    payload.slot ?? '',
  ].join('|');
}

function getQueuedCheckInKey(item: QueuedCheckInItem): string {
  return getDedupeKey(item.payload);
}

function getLatestQueueError(queue: QueuedCheckInItem[]): string | null {
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    const item = queue[index];
    if (item.lastError) {
      return item.lastError;
    }
  }

  return null;
}

/**
 * Queues check-in writes locally and drains them in the background so the kiosk can advance
 * immediately even when the network is slow or unavailable.
 */
export function useQueuedCheckInAttendeeMutation(
  eventId: string | undefined,
  options: UseQueuedCheckInAttendeeMutationOptions,
) {
  const { updateAttendee, refreshCache } = options;
  const queryClient = useQueryClient();
  const queueStorage = useLocalStorage<QueuedCheckInItem[]>(getQueueStorageKey(eventId));
  const [queue, setQueue] = useState<QueuedCheckInItem[]>(() => queueStorage.get() ?? []);
  const queueRef = useRef(queue);
  const isDrainingRef = useRef(false);
  const [isDraining, setIsDraining] = useState(false);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    if (queue.length === 0) {
      queueStorage.remove();
      return;
    }

    queueStorage.set(queue);
  }, [queue, queueStorage]);

  const drainQueue = useCallback(async () => {
    if (!eventId || isDrainingRef.current) {
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return;
    }

    const caller = createEdgeFunctionCaller<
      CheckInAttendeeInput,
      CheckInAttendeeSuccess | CheckInAttendeeError
    >('check-in-attendee');

    isDrainingRef.current = true;
    setIsDraining(true);

    try {
      while (true) {
        const now = Date.now();
        const nextItem = queueRef.current.find(
          (item) => item.status === 'pending' && item.nextAttemptAt <= now,
        );

        if (!nextItem) {
          break;
        }

        setQueue((currentQueue) =>
          currentQueue.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: 'sending',
                  attempts: item.attempts + 1,
                  lastError: null,
                }
              : item,
          ),
        );

        try {
          const response = await caller(nextItem.payload);

          if (!response.success) {
            throw new Error(response.error || 'Failed to check in attendee.');
          }

          if (response.result.status === 'rejected') {
            throw new Error(response.result.message || 'Failed to check in attendee.');
          }

          updateAttendee(nextItem.registrationId, {
            check_in_status: 'checked_in',
            official_check_in_time: response.result.official_check_in_time,
          });

          queryClient.invalidateQueries({
            queryKey: ['admin-attendance-search', eventId],
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.adminAttendanceAnswers(eventId),
          });
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.adminAttendanceSlotSummaries(eventId),
          });

          setQueue((currentQueue) => currentQueue.filter((item) => item.id !== nextItem.id));
          continue;
        } catch (error) {
          const message = getCheckInErrorMessage(error);

          if (!isRetryableCheckInError(error)) {
            setQueue((currentQueue) =>
              currentQueue.map((item) =>
                item.id === nextItem.id
                  ? {
                      ...item,
                      status: 'failed',
                      lastError: message,
                      nextAttemptAt: Number.POSITIVE_INFINITY,
                    }
                  : item,
              ),
            );
            refreshCache();
            continue;
          }

          const attempts = nextItem.attempts + 1;
          setQueue((currentQueue) =>
            currentQueue.map((item) =>
              item.id === nextItem.id
                ? {
                    ...item,
                    status: 'pending',
                    attempts,
                    lastError: message,
                    nextAttemptAt: Date.now() + getRetryDelayMs(attempts),
                  }
                : item,
            ),
          );
          break;
        }
      }
    } finally {
      isDrainingRef.current = false;
      setIsDraining(false);
    }
  }, [eventId, queryClient, refreshCache, updateAttendee]);

  useEffect(() => {
    if (queue.length === 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void drainQueue();
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [drainQueue, queue.length]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      void drainQueue();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [drainQueue]);

  const enqueueCheckIn = useCallback(
    (payload: CheckInAttendeeInput, registrationId: string): QueueOutcome => {
      if (!eventId) {
        throw new Error('Missing event ID for queued check-in.');
      }

      const dedupeKey = getDedupeKey(payload);
      const existingItem = queueRef.current.find(
        (item) => getQueuedCheckInKey(item) === dedupeKey && item.status !== 'failed',
      );

      if (existingItem) {
        return { queued: false, item: existingItem };
      }

      const item = createQueuedCheckInItem(payload, registrationId);
      const nextQueue = [...queueRef.current, item];
      queueRef.current = nextQueue;
      setQueue(nextQueue);

      updateAttendee(registrationId, {
        check_in_status: 'checked_in',
        official_check_in_time: item.optimisticCheckedInAt,
      });

      void drainQueue();

      return { queued: true, item };
    },
    [drainQueue, eventId, updateAttendee],
  );

  return {
    enqueueCheckIn,
    pendingCount: useMemo(
      () => queue.filter((item) => item.status === 'pending' || item.status === 'sending').length,
      [queue],
    ),
    isDraining,
    lastError: useMemo(() => getLatestQueueError(queue), [queue]),
    queue,
  };
}
