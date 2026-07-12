import { useQuery } from '@tanstack/react-query';

import { exportRegistrationNamesResponseSchema } from '@/lib/domain/registrations';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface RegistrationNamesRequest {
  event_id: string;
  response_mode: 'names_json';
}

interface RegistrationNamesResponse {
  success: boolean;
  event_title: string;
  row_count: number;
  answer_fields: Array<{
    field_id: string;
    label: string;
  }>;
  rows: Array<{
    full_name: string;
    member_id: string;
    email: string;
    phone: string;
    metadata: string;
    role: string;
    category: string;
    registration_status: string;
    submitted_at: string;
    updated_at: string;
    answer_values: Record<string, string>;
  }>;
}

interface UseRegistrationNamesQueryOptions {
  enabled?: boolean;
}

export const REGISTRATION_NAMES_QUERY_KEY = (eventId: string) =>
  ['registration-names', eventId] as const;

/**
 * Loads event-wide registration names/answers for sharing and caches results to avoid repeated
 * calls to the rate-limited export Edge Function.
 */
export function useRegistrationNamesQuery(
  eventId: string,
  options: UseRegistrationNamesQueryOptions = {},
) {
  return useQuery({
    queryKey: REGISTRATION_NAMES_QUERY_KEY(eventId),
    enabled: options.enabled ?? true,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      const caller = createEdgeFunctionCaller<RegistrationNamesRequest, RegistrationNamesResponse>(
        'export-registrations-csv',
      );

      const payload = await caller({ event_id: eventId, response_mode: 'names_json' });
      const parsed = exportRegistrationNamesResponseSchema.safeParse(payload);

      if (!parsed.success) {
        throw new Error('Failed to parse registration names response');
      }

      return parsed.data;
    },
  });
}
