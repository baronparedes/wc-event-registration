import { useQuery } from '@tanstack/react-query';

import type { PublicRegistrationCheckResult } from '@/lib/domain/public-registrations';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface PublicAttendeeCheckRequest {
  email: string;
  event_slug: string;
}

export async function fetchPublicAttendeeCheck(email: string, eventSlug: string) {
  const caller = createEdgeFunctionCaller<
    PublicAttendeeCheckRequest,
    PublicRegistrationCheckResult
  >('public-attendee-lookup');

  const response = await caller({ email, event_slug: eventSlug });

  if (!response.success) {
    if ('reason' in response && response.reason === 'not_found') {
      return null;
    }

    const reason = 'reason' in response ? String(response.reason) : 'Failed to check attendee';
    throw new Error(reason);
  }

  return response.existing_registration;
}

/**
 * Check if an email already has a registration for the given event.
 * Used to detect existing registrations before submission.
 */
export function usePublicAttendeeCheckQuery(email: string | null, eventSlug: string | null) {
  return useQuery({
    queryKey: ['publicAttendeeCheck', email, eventSlug],
    queryFn: async () => {
      if (!email || !eventSlug) {
        return null;
      }

      return fetchPublicAttendeeCheck(email, eventSlug);
    },
    enabled: Boolean(email && eventSlug),
    staleTime: 0,
  });
}
