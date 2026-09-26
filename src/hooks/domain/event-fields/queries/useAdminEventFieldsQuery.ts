import { useQuery } from '@tanstack/react-query';

import { fetchAdminEventFields } from '@/lib/domain/event-fields';
import type { AdminEventField } from '@/lib/domain/event-fields';

export const adminEventFieldsQueryKey = (eventId: string) =>
  ['admin-event-fields', eventId] as const;

/**
 * Fetches all event fields for the given event ID, ordered by display_order.
 * Used in the admin field builder to list and manage registration form fields.
 */
export function useAdminEventFieldsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? adminEventFieldsQueryKey(eventId) : ['admin-event-fields', ''],
    queryFn: async (): Promise<AdminEventField[]> => {
      if (!eventId) return [];
      return fetchAdminEventFields(eventId);
    },
    enabled: Boolean(eventId),
  });
}
