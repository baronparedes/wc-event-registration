import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { logger } from '../../../../lib/logger'
import type { EventAvailability, PublicEvent } from '../../../../lib/event-registration'

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

      const { data, error } = await supabase
        .from('events')
        .select(
          'id, slug, title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, registration_mode',
        )
        .eq('slug', slug)
        .maybeSingle<PublicEvent>()

      if (error) {
        throw error
      }

      if (!data) {
        return { status: 'unavailable', reason: 'not_found_or_unpublished' } as EventAvailability
      }

      const now = Date.now()
      const opensAt = data.registration_opens_at ? Date.parse(data.registration_opens_at) : null
      const closesAt = data.registration_closes_at ? Date.parse(data.registration_closes_at) : null

      if (data.registration_mode !== 'open') {
        return {
          status: 'unavailable',
          reason: 'registration_closed',
          event: data,
        } as EventAvailability
      }

      if (opensAt !== null && now < opensAt) {
        return { status: 'unavailable', reason: 'not_open_yet', event: data } as EventAvailability
      }

      if (closesAt !== null && now >= closesAt) {
        return {
          status: 'unavailable',
          reason: 'registration_closed',
          event: data,
        } as EventAvailability
      }

      const { data: countData, error: countError } = await supabase.rpc(
        'get_event_registration_count',
        { p_event_id: data.id },
      )
      if (countError) {
        logger.warn('Could not fetch registration count:', countError)
      }

      return {
        status: 'available',
        event: data,
        registration_count: (countData as number | null) ?? 0,
      } as EventAvailability
    },
    enabled: Boolean(slug),
  })
}
