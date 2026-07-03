import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { validatePublicEventFieldConfig } from '@/lib/domain/event-fields';
import type {
  EventFieldConfigValidationResult,
  PublicEventFieldRow,
} from '@/lib/domain/event-fields';
import { supabase } from '@/lib/infrastructure';
import { logger } from '@/lib/infrastructure';

/**
 * Hook to fetch dynamic event fields for a specific event.
 * Includes runtime metadata validation and configuration issue detection.
 *
 * @param eventId - The event ID to fetch fields for
 * @returns React Query result with valid fields and any configuration issues
 */
export function usePublicEventFieldsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.publicEventFields(eventId),
    queryFn: async () => {
      if (!eventId) {
        return { validFields: [], issues: [] } as EventFieldConfigValidationResult;
      }

      logger.debug('Fetching event fields for event:', eventId);

      const { data, error } = await supabase
        .from('event_fields')
        .select(
          'id, event_id, field_key, label, field_type, is_required, is_active, placeholder, help_text, options, validation_rules, display_order',
        )
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .returns<PublicEventFieldRow[]>();

      if (error) {
        throw error;
      }

      return validatePublicEventFieldConfig(data ?? []);
    },
    enabled: Boolean(eventId),
  });
}
