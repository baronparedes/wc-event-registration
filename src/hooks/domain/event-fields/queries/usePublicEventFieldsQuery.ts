import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { validatePublicEventFieldConfig } from '@/lib/domain/event-fields';
import type {
  EventFieldApplicability,
  EventFieldConfigValidationResult,
  PublicEventFieldRow,
} from '@/lib/domain/event-fields';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface GetPublicEventFieldsRequest {
  event_id: string;
  audience?: Exclude<EventFieldApplicability, 'both'>;
}

interface GetPublicEventFieldsResponse {
  success: true;
  fields: PublicEventFieldRow[];
}

export function usePublicEventFieldsQuery(
  eventId: string | undefined,
  audience: Exclude<EventFieldApplicability, 'both'> | undefined,
) {
  return useQuery({
    queryKey: QUERY_KEYS.publicEventFields(eventId, audience),
    queryFn: async () => {
      if (!eventId) {
        return { validFields: [], issues: [] } as EventFieldConfigValidationResult;
      }

      const caller = createEdgeFunctionCaller<
        GetPublicEventFieldsRequest,
        GetPublicEventFieldsResponse
      >('get-public-event-fields');
      const payload = await caller({
        event_id: eventId,
        ...(audience ? { audience } : {}),
      });

      return validatePublicEventFieldConfig(payload.fields);
    },
    enabled: Boolean(eventId),
    staleTime: QUERY_STALE_TIME_MS.long,
  });
}
