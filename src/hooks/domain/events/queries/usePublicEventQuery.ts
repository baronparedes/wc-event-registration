import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminEvent, EventAvailability } from '@/lib/domain/events';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface GetPublicEventRequest {
  slug: string;
}

interface GetPublicEventResponse {
  success: true;
  event: AdminEvent | null;
  registration_count: number;
}

export function usePublicEventQuery(slug: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.publicEventBySlug(slug),
    queryFn: async () => {
      if (!slug) {
        throw new Error('Event slug is required');
      }

      const caller = createEdgeFunctionCaller<GetPublicEventRequest, GetPublicEventResponse>(
        'get-public-event',
      );
      const payload = await caller({ slug });

      if (!payload.event) {
        return { status: 'unavailable', reason: 'not_found_or_unpublished' } as EventAvailability;
      }

      const data = payload.event;
      const now = Date.now();
      const opensAt = data.registration_opens_at ? Date.parse(data.registration_opens_at) : null;
      const closesAt = data.registration_closes_at ? Date.parse(data.registration_closes_at) : null;

      if (data.registration_mode !== 'open') {
        return {
          status: 'unavailable',
          reason: 'registration_closed',
          event: data,
        } as EventAvailability;
      }

      if (opensAt !== null && now < opensAt) {
        return { status: 'unavailable', reason: 'not_open_yet', event: data } as EventAvailability;
      }

      if (closesAt !== null && now >= closesAt) {
        return {
          status: 'unavailable',
          reason: 'registration_closed',
          event: data,
        } as EventAvailability;
      }

      return {
        status: 'available',
        event: data,
        registration_count: payload.registration_count,
      } as EventAvailability;
    },
    enabled: Boolean(slug),
    staleTime: QUERY_STALE_TIME_MS.short,
    refetchOnWindowFocus: false,
  });
}
