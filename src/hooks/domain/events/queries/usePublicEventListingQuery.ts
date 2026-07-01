import { useQuery } from '@tanstack/react-query'
import { QUERY_KEYS } from '@/config/constants'
import { supabase } from '@/lib/infrastructure'
import type { PublicEventListingItem } from '@/lib/domain/events'

export function usePublicEventListingQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.publicEventListing(),
    queryFn: async (): Promise<PublicEventListingItem[]> => {
      const nowMs = Date.now()
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const threeMonthsAgoMs = threeMonthsAgo.getTime()

      const { data, error } = await supabase
        .from('events')
        .select(
          'id, slug, title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, allow_public_registrations',
        )
        .eq('status', 'published')
        .order('starts_at', { ascending: true })

      if (error) throw error

      const rows = (data ?? []) as Omit<PublicEventListingItem, 'listingStatus'>[]

      return rows.flatMap((event) => {
        const startsAt = event.starts_at ? Date.parse(event.starts_at) : null
        const opensAt = event.registration_opens_at ? Date.parse(event.registration_opens_at) : null
        const closesAt = event.registration_closes_at
          ? Date.parse(event.registration_closes_at)
          : null
        const isRegistrationOpen = closesAt === null || nowMs < closesAt
        const isRecentPast = startsAt !== null && startsAt >= threeMonthsAgoMs && startsAt < nowMs

        const listingStatus: PublicEventListingItem['listingStatus'] | null = isRecentPast
          ? 'past'
          : opensAt !== null && nowMs < opensAt && isRegistrationOpen
            ? 'upcoming'
            : isRegistrationOpen
              ? 'open'
              : null

        if (listingStatus === null) return []
        return [{ ...event, listingStatus }]
      })
    },
  })
}
