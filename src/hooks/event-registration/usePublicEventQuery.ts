import { useQuery } from '@tanstack/react-query'
import { fetchPublicEventBySlug } from '../../lib/event-registration/queries'
import { logger } from '../../lib/logger'

/**
 * Hook to fetch a public event by slug with availability checks.
 * Handles event status validation, registration window checks, and gate states.
 *
 * @param slug - The event slug (URL-friendly identifier)
 * @returns React Query result with availability status and event data
 */
export function usePublicEventQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-event-by-slug', slug],
    queryFn: async () => {
      if (!slug) {
        throw new Error('Event slug is required')
      }
      logger.debug('Fetching event by slug:', slug)
      return fetchPublicEventBySlug(slug)
    },
    enabled: Boolean(slug),
  })
}
