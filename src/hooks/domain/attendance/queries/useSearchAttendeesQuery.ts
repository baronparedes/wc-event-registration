/* c8 ignore start */
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendeeSearchResult, SearchAttendeesInput } from '@/lib/domain/attendance';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type SearchAttendeesSuccess = {
  success: true;
  results: AttendeeSearchResult[];
};

type SearchAttendeesError = {
  success: false;
  error: string;
  error_code?: string;
  detail?: string;
};

/** Searches registered attendees by member ID, name fragment, or email token. */
export function useSearchAttendeesQuery(eventId: string | undefined, searchToken: string) {
  const normalizedSearchToken = searchToken.trim();

  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSearchByTerm(eventId, normalizedSearchToken),
    queryFn: async (): Promise<AttendeeSearchResult[]> => {
      if (!eventId || normalizedSearchToken.length === 0) {
        return [];
      }

      const caller = createEdgeFunctionCaller<
        SearchAttendeesInput,
        SearchAttendeesSuccess | SearchAttendeesError
      >('search-attendees');

      const response = await caller({
        event_id: eventId,
        search_token: normalizedSearchToken,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to search attendees.');
      }

      return response.results;
    },
    enabled: Boolean(eventId) && normalizedSearchToken.length > 0,
  });
}
/* c8 ignore stop */
