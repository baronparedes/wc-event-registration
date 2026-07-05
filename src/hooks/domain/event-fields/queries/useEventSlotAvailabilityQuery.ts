import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { EventSlotAvailabilityResponse } from '@/lib/domain/event-fields';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface EventSlotAvailabilityRequest {
  event_id: string;
}

type EventSlotAvailabilitySuccess = {
  success: true;
  event_id: string;
  fields: EventSlotAvailabilityResponse['fields'];
};

/**
 * Fetches per-option slot usage for an event so the registration UI can show remaining capacity.
 */
export function useEventSlotAvailabilityQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.eventSlotAvailability(eventId),
    enabled: Boolean(eventId),
    staleTime: 15 * 1000,
    queryFn: async () => {
      if (!eventId) {
        return null;
      }

      const caller = createEdgeFunctionCaller<
        EventSlotAvailabilityRequest,
        EventSlotAvailabilitySuccess
      >('event-slot-availability');
      const payload = await caller({ event_id: eventId });

      if (!payload.success) {
        throw new Error('Failed to load slot availability');
      }

      return payload;
    },
  });
}
