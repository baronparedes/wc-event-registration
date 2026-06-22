import { useQuery } from '@tanstack/react-query'
import { fetchPublicEventFields } from '../../lib/event-registration/queries'
import { logger } from '../../lib/logger'

/**
 * Hook to fetch dynamic event fields for a specific event.
 * Includes runtime metadata validation and configuration issue detection.
 *
 * @param eventId - The event ID to fetch fields for
 * @returns React Query result with valid fields and any configuration issues
 */
export function usePublicEventFieldsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: ['public-event-fields', eventId],
    queryFn: async () => {
      if (!eventId) {
        return { validFields: [], issues: [] }
      }
      logger.debug('Fetching event fields for event:', eventId)
      return fetchPublicEventFields(eventId)
    },
    enabled: Boolean(eventId),
  })
}
