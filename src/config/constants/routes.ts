export const ROUTE_PATHS = {
  home: '/',
  notFound: '*',
  eventRegisterPattern: '/events/:slug/register',
  adminLogin: '/admin/login',
  adminMembers: '/admin/members',
  adminMemberDetailPattern: '/admin/members/:id',
  adminEvents: '/admin/events',
  adminEventNew: '/admin/events/new',
  adminEventDetailPattern: '/admin/events/:id',
  adminEventFieldsPattern: '/admin/events/:id/fields',
  adminEventRegistrationsPattern: '/admin/events/:id/registrations',
  adminRegistrationDetailPattern: '/admin/events/:id/registrations/:registration_id',
} as const

export const ROUTE_PREFIXES = {
  admin: '/admin/',
} as const

export function toEventRegistration(slug: string): string {
  return `/events/${slug}/register`
}

export function toAdminMemberDetail(memberId: string): string {
  return `/admin/members/${memberId}`
}

export function toAdminEventDetail(eventId: string): string {
  return `/admin/events/${eventId}`
}

export function toAdminEventFields(eventId: string): string {
  return `/admin/events/${eventId}/fields`
}

export function toAdminEventRegistrations(eventId: string): string {
  return `/admin/events/${eventId}/registrations`
}

export function toAdminRegistrationDetail(eventId: string, registrationId: string): string {
  return `/admin/events/${eventId}/registrations/${registrationId}`
}
