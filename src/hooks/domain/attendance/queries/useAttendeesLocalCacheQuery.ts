/* c8 ignore start */
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { useLocalStorage } from '@/hooks/utils';
import type { AttendeeSearchResult } from '@/lib/domain/attendance';
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

const CACHE_KEY_PREFIX = 'wc:attendees';

function getStorageKey(eventId: string): string {
  return `${CACHE_KEY_PREFIX}:${eventId}`;
}

function buildCacheEntry(attendees: AttendeeSearchResult[]): LocalCacheEntry {
  const entry: LocalCacheEntry = { attendees, cachedAt: Date.now() };
  return entry;
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

  const query = useQuery({
    queryKey: QUERY_KEYS.adminAttendeesLocalCache(eventId),
    queryFn: async (): Promise<LocalCacheEntry | null> => {
      if (!eventId) return null;

      const cached = cacheStorage.get();
      if (cached) return cached;

      const attendees = await fetchAllAttendees(eventId);
      const entry = buildCacheEntry(attendees);
      cacheStorage.set(entry);
      return entry;
    },
    enabled: Boolean(eventId),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — cache is valid for one event day
    gcTime: 24 * 60 * 60 * 1000,
  });

  function refresh() {
    if (!eventId) return;
    cacheStorage.remove();
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminAttendeesLocalCache(eventId) });
  }

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
/* c8 ignore stop */
