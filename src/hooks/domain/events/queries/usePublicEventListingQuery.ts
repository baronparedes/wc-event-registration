import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { PublicEventListingItem } from '@/lib/domain/events';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

interface GetPublicEventListingResponse {
  success: true;
  events: Omit<PublicEventListingItem, 'listingStatus'>[];
}

export function usePublicEventListingQuery() {
  return useQuery({
    queryKey: QUERY_KEYS.publicEventListing(),
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
        const isRegistrationOpen = closesAt === null || nowMs < closesAt;
        const pastReferenceAt = endsAt ?? startsAt;
        const isRecentPast =
          pastReferenceAt !== null &&
          pastReferenceAt >= threeMonthsAgoMs &&
          pastReferenceAt < nowMs;

        const listingStatus: PublicEventListingItem['listingStatus'] | null = isRecentPast
          ? 'past'
          : opensAt !== null && nowMs < opensAt && isRegistrationOpen
            ? 'upcoming'
            : isRegistrationOpen
              ? 'open'
              : null;

        if (listingStatus === null) return [];
        return [{ ...event, listingStatus }];
      });
    },
  });
}
