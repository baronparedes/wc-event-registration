export const PAGINATION_DEFAULTS = {
  adminEventsPageSize: 20,
  adminMembersPageSize: 20,
  adminRegistrationsPageSize: 25,
} as const;

export const PAGINATION_OPTIONS = {
  adminEvents: [10, 20, 50],
  adminMembers: [10, 20, 50],
  adminRegistrations: [10, 25, 50],
};

export const QUERY_STALE_TIME_MS = {
  immediate: 0,
} as const;
