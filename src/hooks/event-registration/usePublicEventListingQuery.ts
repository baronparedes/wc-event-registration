import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { PublicEventListingItem } from '../../lib/event-registration'

export function usePublicEventListingQuery() {
  return useQuery({
    queryKey: ['public-event-listing'],
    queryFn: async (): Promise<PublicEventListingItem[]> => {
      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('events')
        .select(
          'id, slug, title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at',
        )
        .eq('registration_mode', 'open')
        .or(`registration_closes_at.is.null,registration_closes_at.gt.${now}`)
        .order('registration_opens_at', { ascending: true })

      if (error) throw error

      const rows = (data ?? []) as Omit<PublicEventListingItem, 'listingStatus'>[]

      return rows.map((event) => {
        const opensAt = event.registration_opens_at ? Date.parse(event.registration_opens_at) : null
        const listingStatus: PublicEventListingItem['listingStatus'] =
          opensAt !== null && Date.now() < opensAt ? 'upcoming' : 'open'
        return { ...event, listingStatus }
      })
    },
  })
}
