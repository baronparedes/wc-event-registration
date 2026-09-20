export const PAGINATION_DEFAULTS = {
  adminEventsPageSize: 50,
  adminMembersPageSize: 50,
  adminRegistrationsPageSize: 25,
} as const;

export const PAGINATION_OPTIONS = {
  adminEvents: [10, 20, 50],
  adminMembers: [10, 20, 50],
  adminRegistrations: [10, 25, 50],
};

export const QUERY_STALE_TIME_MS = {
  immediate: 0,
  adminList: 5 * 60 * 1000,
  detail: 5 * 60 * 1000,
  short: 5 * 60 * 1000,
  long: 15 * 60 * 1000,
  oneHour: 60 * 60 * 1000,
  oneDay: 24 * 60 * 60 * 1000,
} as const;
