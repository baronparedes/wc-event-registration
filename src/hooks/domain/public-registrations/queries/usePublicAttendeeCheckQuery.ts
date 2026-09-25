import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import type { PublicRegistrationCheckResult } from '@/lib/domain/public-registrations';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface PublicAttendeeCheckRequest {
  email: string;
  event_slug: string;
}

const callPublicAttendeeLookup = createEdgeFunctionCaller<
  PublicAttendeeCheckRequest,
  PublicRegistrationCheckResult
>('public-attendee-lookup');

async function fetchPublicAttendeeCheck(email: string, eventSlug: string) {
  const response = await callPublicAttendeeLookup({ email, event_slug: eventSlug });

  if (!response.success) {
    if ('reason' in response && response.reason === 'not_found') {
      return null;
    }

    const reason = 'reason' in response ? String(response.reason) : 'Failed to check attendee';
    throw new Error(reason);
  }

  return response.existing_registration ?? null;
}

const PUBLIC_ATTENDEE_CHECK_QUERY_KEY = (
  email: string | null | undefined,
  eventSlug: string | null | undefined,
) => ['publicAttendeeCheck', email ?? '', eventSlug ?? ''] as const;

/**
 * Check if an email already has a registration for the given event.
 * Used to detect existing registrations before submission.
 */
export function usePublicAttendeeCheckQuery(
  email: string | null | undefined,
  eventSlug: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: PUBLIC_ATTENDEE_CHECK_QUERY_KEY(email, eventSlug),
    queryFn: async () => {
      if (!email || !eventSlug) {
        return null;
      }

      return fetchPublicAttendeeCheck(email, eventSlug);
    },
    enabled: Boolean(email && eventSlug) && (options?.enabled ?? true),
    staleTime: QUERY_STALE_TIME_MS.immediate,
  });
}
