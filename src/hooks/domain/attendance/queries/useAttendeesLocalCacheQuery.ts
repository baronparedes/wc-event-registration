/* c8 ignore start */
import { useCallback, useRef } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { useAttendanceCheckInRealtime } from '@/hooks/domain/attendance/state/useAttendanceCheckInRealtime';
import { useLocalStorage } from '@/hooks/utils';
import type {
  AttendanceCheckInRealtimeEvent,
  AttendeeKind,
  AttendeeSearchResult,
} from '@/lib/domain/attendance/types';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type ListAttendeesInput = {
  event_id: string;
};

type ListAttendeesSuccess = {
  success: true;
  results: AttendeeSearchResult[];
};

type ListAttendeesError = {
  success: false;
  error: string;
  error_code?: string;
};

type LocalCacheEntry = {
  attendees: AttendeeSearchResult[];
  cachedAt: number;
};

type AttendeeCheckInPatch = {
  id: string;
  kind: AttendeeKind;
  checkedInAt: string;
  registrationId: string | null;
  publicRegistrationId: string | null;
};

const CACHE_KEY_PREFIX = 'wc:attendees';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REFRESH_THROTTLE_MS = 2000;

function getStorageKey(eventId: string): string {
  return `${CACHE_KEY_PREFIX}:${eventId}`;
}

function buildCacheEntry(attendees: AttendeeSearchResult[]): LocalCacheEntry {
  const entry: LocalCacheEntry = { attendees, cachedAt: Date.now() };
  return entry;
}

function isCacheExpired(cachedAt: number, now = Date.now()): boolean {
  return now - cachedAt >= CACHE_TTL_MS;
}

function resolveCheckInTime(currentTime: string | null, incomingTime: string): string {
  if (!currentTime) return incomingTime;

  const currentMs = Date.parse(currentTime);
  const incomingMs = Date.parse(incomingTime);

  if (!Number.isFinite(currentMs) || !Number.isFinite(incomingMs)) {
    return incomingTime;
  }

  return incomingMs < currentMs ? incomingTime : currentTime;
}

function matchesAttendeePatch(
  attendee: AttendeeSearchResult,
  patch: AttendeeCheckInPatch,
): boolean {
  if (patch.kind === 'registered') {
    return (
      attendee.registration_id === patch.registrationId || attendee.registration_id === patch.id
    );
  }

  return (
    attendee.public_registration_id === patch.publicRegistrationId ||
    attendee.public_registration_id === patch.id ||
    attendee.registration_id === patch.id
  );
}

export function applyCheckInPatchToAttendees(
  attendees: AttendeeSearchResult[],
  patch: AttendeeCheckInPatch,
): { attendees: AttendeeSearchResult[]; didUpdate: boolean } {
  let didUpdate = false;

  const nextAttendees: AttendeeSearchResult[] = attendees.map((attendee): AttendeeSearchResult => {
    if (!matchesAttendeePatch(attendee, patch)) {
      return attendee;
    }

    const nextOfficialCheckInTime = resolveCheckInTime(
      attendee.official_check_in_time,
      patch.checkedInAt,
    );
    const hasSameStatus = attendee.check_in_status === 'checked_in';
    const hasSameTime = attendee.official_check_in_time === nextOfficialCheckInTime;

    if (hasSameStatus && hasSameTime) {
      return attendee;
    }

    didUpdate = true;
    return {
      ...attendee,
      check_in_status: 'checked_in',
      official_check_in_time: nextOfficialCheckInTime,
    } as AttendeeSearchResult;
  });

  return { attendees: nextAttendees, didUpdate };
}

async function fetchAllAttendees(eventId: string): Promise<AttendeeSearchResult[]> {
  const caller = createEdgeFunctionCaller<
    ListAttendeesInput,
    ListAttendeesSuccess | ListAttendeesError
  >('list-attendees-v2');

  const response = await caller({ event_id: eventId });

  if (!response.success) {
    throw new Error(response.error || 'Failed to load attendee list.');
  }

  return response.results;
}

/**
 * Fetches all attendees for an event once and caches them in localStorage.
 * Subsequent searches are performed locally against the cache.
 * Call `refresh()` to force a re-fetch from the server.
 * Call `updateAttendee()` to patch a single attendee in the cache (e.g. after check-in).
 */
export function useAttendeesLocalCacheQuery(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const cacheStorage = useLocalStorage<LocalCacheEntry>(eventId ? getStorageKey(eventId) : null);
  const lastRefreshAtRef = useRef<number>(0);

  const query = useQuery({
    queryKey: QUERY_KEYS.adminAttendeesLocalCache(eventId),
    queryFn: async (): Promise<LocalCacheEntry | null> => {
      if (!eventId) return null;

      const cached = cacheStorage.get();
      if (cached && !isCacheExpired(cached.cachedAt)) return cached;
      if (cached) {
        cacheStorage.remove();
      }

      const attendees = await fetchAllAttendees(eventId);
      const entry = buildCacheEntry(attendees);
      cacheStorage.set(entry);

      return entry;
    },
    enabled: Boolean(eventId),
    staleTime: CACHE_TTL_MS, // 24 hours — cache is valid for one event day
    gcTime: CACHE_TTL_MS,
  });

  const refresh = useCallback(() => {
    if (!eventId) return;

    cacheStorage.remove();
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminAttendeesLocalCache(eventId) });
  }, [cacheStorage, eventId, queryClient]);

  const refreshThrottled = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshAtRef.current < REFRESH_THROTTLE_MS) {
      return;
    }

    lastRefreshAtRef.current = now;
    refresh();
  }, [refresh]);

  function updateAttendee(registrationId: string, updates: Partial<AttendeeSearchResult>): void {
    if (!eventId) return;
    const current = query.data;
    if (!current) return;

    const updated = current.attendees.map((a) =>
      a.registration_id === registrationId ? { ...a, ...updates } : a,
    );

    const newEntry = buildCacheEntry(updated);
    cacheStorage.set(newEntry);
    queryClient.setQueryData(QUERY_KEYS.adminAttendeesLocalCache(eventId), newEntry);
  }

  const handleRealtimeCheckIn = useCallback(
    (checkInEvent: AttendanceCheckInRealtimeEvent) => {
      if (!eventId) return;

      const current = queryClient.getQueryData<LocalCacheEntry>(
        QUERY_KEYS.adminAttendeesLocalCache(eventId),
      );

      if (!current?.attendees?.length) {
        refreshThrottled();
        return;
      }

      const patch: AttendeeCheckInPatch = {
        id: checkInEvent.public_registration_id ?? checkInEvent.registration_id ?? '',
        kind: checkInEvent.attendee_kind,
        checkedInAt: checkInEvent.first_checked_in_at,
        registrationId: checkInEvent.registration_id,
        publicRegistrationId: checkInEvent.public_registration_id,
      };

      if (!patch.id) {
        refreshThrottled();
        return;
      }

      const { attendees: patchedAttendees, didUpdate } = applyCheckInPatchToAttendees(
        current.attendees,
        patch,
      );

      if (!didUpdate) {
        refreshThrottled();
        return;
      }

      const updatedEntry = buildCacheEntry(patchedAttendees);
      cacheStorage.set(updatedEntry);
      queryClient.setQueryData(QUERY_KEYS.adminAttendeesLocalCache(eventId), updatedEntry);
    },
    [cacheStorage, eventId, queryClient, refreshThrottled],
  );

  useAttendanceCheckInRealtime(eventId, {
    onCheckIn: handleRealtimeCheckIn,
  });

  return {
    attendees: query.data?.attendees ?? null,
    cachedAt: query.data?.cachedAt ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refresh,
    updateAttendee,
  };
}

/**
 * Filters a list of attendees by a search token.
 * Matches against full_name, member_id, and email (case-insensitive).
 */
export function searchAttendeesLocally(
  attendees: AttendeeSearchResult[],
  token: string,
): AttendeeSearchResult[] {
  const t = token.trim().toLowerCase();
  if (!t) return [];

  return attendees.filter((a) => {
    const fullName = a.full_name.toLowerCase();
    const memberId = (a.member_id ?? '').toLowerCase();
    const email = (a.email ?? '').toLowerCase();

    return fullName.includes(t) || memberId.includes(t) || email.includes(t);
  });
}

export { CACHE_TTL_MS, isCacheExpired };
/* c8 ignore stop */
