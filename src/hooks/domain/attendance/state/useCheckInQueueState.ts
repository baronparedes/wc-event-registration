import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CheckInAttendeeInput, CheckInResult, CheckInStatus } from '@/lib/domain/attendance';

const STORAGE_KEY = 'admin-check-in-queue-v1';

export type CheckInQueueItemStatus = 'pending' | 'syncing' | 'synced' | 'failed';

type CheckInQueueItem = {
  id: string;
  createdAt: string;
  lastAttemptAt: string | null;
  attempts: number;
  status: CheckInQueueItemStatus;
  errorMessage: string | null;
  syncResultStatus: CheckInStatus | null;
  syncResultMessage: string | null;
  officialCheckInTime: string | null;
  payload: CheckInAttendeeInput;
};

export type CheckInQueueItemView = CheckInQueueItem;

export type CheckInQueueSummary = {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  total: number;
};

type UseCheckInQueueStateParams = {
  enabled?: boolean;
  isOnline: boolean;
  execute: (payload: CheckInAttendeeInput) => Promise<CheckInResult>;
};

function parseStoredQueue(raw: string | null): CheckInQueueItem[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is CheckInQueueItem => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<CheckInQueueItem>;
      return (
        typeof candidate.id === 'string' &&
        typeof candidate.createdAt === 'string' &&
        typeof candidate.attempts === 'number' &&
        (candidate.status === 'pending' ||
          candidate.status === 'syncing' ||
          candidate.status === 'synced' ||
          candidate.status === 'failed') &&
        candidate.payload !== undefined
      );
    });
  } catch {
    return [];
  }
}

function buildQueueItem(payload: CheckInAttendeeInput): CheckInQueueItem {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
    attempts: 0,
    status: 'pending',
    errorMessage: null,
    syncResultStatus: null,
    syncResultMessage: null,
    officialCheckInTime: null,
    payload,
  };
}

function summarizeQueue(items: CheckInQueueItem[]): CheckInQueueSummary {
  return items.reduce<CheckInQueueSummary>(
    (summary, item) => {
      summary[item.status] += 1;
      summary.total += 1;
      return summary;
    },
    {
      pending: 0,
      syncing: 0,
      synced: 0,
      failed: 0,
      total: 0,
    },
  );
}

/**
 * Manages offline check-in queue state and replay.
 */
export function useCheckInQueueState({
  enabled = true,
  isOnline,
  execute,
}: UseCheckInQueueStateParams) {
  const [items, setItems] = useState<CheckInQueueItem[]>(() => {
    if (!enabled || typeof window === 'undefined') {
      return [];
    }

    return parseStoredQueue(window.localStorage.getItem(STORAGE_KEY));
  });

  const itemsRef = useRef(items);
  const isProcessingRef = useRef(false);

  const updateItems = useCallback(
    (updater: (current: CheckInQueueItem[]) => CheckInQueueItem[]) => {
      setItems((current) => {
        const next = updater(current);
        itemsRef.current = next;
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [enabled, items]);

  const summary = useMemo(() => summarizeQueue(items), [items]);

  const enqueue = useCallback(
    (payload: CheckInAttendeeInput) => {
      if (!enabled) {
        return '';
      }

      const nextItem = buildQueueItem(payload);
      updateItems((current) => [...current, nextItem]);
      return nextItem.id;
    },
    [enabled, updateItems],
  );

  const processQueue = useCallback(async () => {
    if (!enabled || !isOnline || isProcessingRef.current) {
      return;
    }

    isProcessingRef.current = true;

    try {
      while (true) {
        const itemToProcess = itemsRef.current.find((item) => item.status === 'pending');

        if (!itemToProcess) {
          break;
        }

        updateItems((current) =>
          current.map((item) =>
            item.id === itemToProcess.id
              ? {
                  ...item,
                  status: 'syncing',
                  attempts: item.attempts + 1,
                  lastAttemptAt: new Date().toISOString(),
                  errorMessage: null,
                  syncResultStatus: null,
                  syncResultMessage: null,
                  officialCheckInTime: null,
                }
              : item,
          ),
        );

        try {
          const result = await execute(itemToProcess.payload);

          updateItems((current) =>
            current.map((item) =>
              item.id === itemToProcess.id
                ? {
                    ...item,
                    status: 'synced',
                    errorMessage: null,
                    syncResultStatus: result.status,
                    syncResultMessage: result.message,
                    officialCheckInTime: result.official_check_in_time,
                  }
                : item,
            ),
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to sync queued check-in.';

          updateItems((current) =>
            current.map((item) =>
              item.id === itemToProcess.id
                ? {
                    ...item,
                    status: 'failed',
                    errorMessage,
                  }
                : item,
            ),
          );
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }, [enabled, execute, isOnline, updateItems]);

  useEffect(() => {
    if (!enabled || !isOnline) {
      return;
    }

    const hasPending = items.some((item) => item.status === 'pending');
    if (!hasPending) {
      return;
    }

    void processQueue();
  }, [enabled, isOnline, items, processQueue]);

  const retryFailed = useCallback(() => {
    if (!enabled) {
      return;
    }

    updateItems((current) =>
      current.map((item) =>
        item.status === 'failed'
          ? {
              ...item,
              status: 'pending',
              errorMessage: null,
            }
          : item,
      ),
    );
  }, [enabled, updateItems]);

  const clearSynced = useCallback(() => {
    if (!enabled) {
      return;
    }

    updateItems((current) => current.filter((item) => item.status !== 'synced'));
  }, [enabled, updateItems]);

  return {
    summary,
    items,
    enqueue,
    retryFailed,
    clearSynced,
    processQueue,
  };
}
