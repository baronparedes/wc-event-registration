export const QUERY_KEYS = {
  publicEventBySlug: (slug: string | null | undefined) => ['public-event-by-slug', slug] as const,
  publicEventListing: () => ['public-event-listing'] as const,
  publicEventFields: (eventId: string | undefined) => ['public-event-fields', eventId] as const,
  adminAttendanceSettings: (eventId: string | undefined) =>
    ['admin-attendance-settings', eventId] as const,
  adminAttendanceFields: (eventId: string | undefined) =>
    ['admin-attendance-fields', eventId] as const,
  adminAttendanceFieldsByActivity: (eventId: string | undefined, activeOnly: boolean) =>
    [...QUERY_KEYS.adminAttendanceFields(eventId), { activeOnly }] as const,
  adminAttendanceAnswers: (eventId: string | undefined) =>
    ['admin-attendance-answers', eventId] as const,
  adminAttendanceSearchByTerm: (eventId: string | undefined, searchTerm: string) =>
    ['admin-attendance-search', eventId, searchTerm] as const,
} as const;
