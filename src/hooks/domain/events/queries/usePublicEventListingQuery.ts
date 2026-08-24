import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { PublicEventListingItem } from '@/lib/domain/events';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface GetPublicEventListingResponse {
  success: true;
  events: Omit<PublicEventListingItem, 'listingStatus'>[];
}

export function usePublicEventListingQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.publicEventListing(),
    staleTime: QUERY_STALE_TIME_MS.short,
    queryFn: async (): Promise<PublicEventListingItem[]> => {
      const nowMs = Date.now();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const threeMonthsAgoMs = threeMonthsAgo.getTime();

      const caller = createEdgeFunctionCaller<Record<string, never>, GetPublicEventListingResponse>(
        'get-public-event-listing',
      );
      const payload = await caller({} as Record<string, never>);

      const rows = payload.events;

      return rows.flatMap((event) => {
        const startsAt = event.starts_at ? Date.parse(event.starts_at) : null;
        const endsAt = event.ends_at ? Date.parse(event.ends_at) : null;
        const opensAt = event.registration_opens_at
          ? Date.parse(event.registration_opens_at)
          : null;
        const closesAt = event.registration_closes_at
          ? Date.parse(event.registration_closes_at)
          : null;

        // 1. Determine basic boolean states
        const isRegistrationOpen =
          closesAt === null || (nowMs < closesAt && event.registration_mode === 'open');

        const pastReferenceAt = endsAt ?? startsAt;
        const isRecentPast =
          pastReferenceAt !== null &&
          pastReferenceAt >= threeMonthsAgoMs &&
          pastReferenceAt < nowMs;

        // 2. Determine the status based on priority
        let listingStatus: PublicEventListingItem['listingStatus'] | null = null;

        if (isRecentPast) {
          listingStatus = 'past';
        } else if (isRegistrationOpen) {
          listingStatus = 'open';
        } else if (
          (startsAt !== null && nowMs < startsAt) ||
          (opensAt !== null && nowMs < opensAt)
        ) {
          // If it's not "past" and not "open", but it's still in the future
          listingStatus = 'upcoming';
        }

        // 3. Filter and return
        if (listingStatus === null) return [];
        return [{ ...event, listingStatus }];
      });
    },
  });
}
