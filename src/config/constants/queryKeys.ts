export const QUERY_KEYS = {
  publicEventBySlug: (slug: string | null | undefined) => ['public-event-by-slug', slug] as const,
  publicEventListing: () => ['public-event-listing'] as const,
  publicEventFields: (eventId: string | undefined) => ['public-event-fields', eventId] as const,
} as const
