import { matchPath } from 'react-router-dom';

export const ROUTE_PATHS = {
  home: '/',
  notFound: '*',
  eventRegisterPattern: '/events/:slug/register',
  eventPublicRegisterPattern: '/events/:slug/register-public',
  adminLogin: '/admin/login',
  adminMembers: '/admin/members',
  adminMembersImport: '/admin/members/import',
  adminMemberDetailPattern: '/admin/members/:id',
  adminEvents: '/admin/events',
  adminEventNew: '/admin/events/new',
  adminEventDetailPattern: '/admin/events/:id',
  adminEventAttendancePattern: '/admin/events/:id/attendance',
  adminEventAttendanceCheckInPattern: '/admin/events/:id/attendance/check-in',
  adminEventAttendanceFieldsPattern: '/admin/events/:id/attendance/fields',
  adminEventAttendanceDataPattern: '/admin/events/:id/attendance/data',
  adminEventAttendanceDataBulkUploadPattern: '/admin/events/:id/attendance/data/bulk-upload',
  adminEventFieldsPattern: '/admin/events/:id/fields',
  adminEventRegistrationsPattern: '/admin/events/:id/registrations',
  adminEventRegistrationsUnregisteredMembersPattern:
    '/admin/events/:id/registrations/unregistered-members',
  adminRegistrationNamesPattern: '/admin/events/:id/registrations/names',
  adminEventPublicRegistrationsPattern: '/admin/events/:id/public-registrations',
  adminRegistrationDetailPattern: '/admin/events/:id/registrations/:registration_id',
  adminPublicRegistrationDetailPattern: '/admin/events/:id/public-registrations/:registration_id',
} as const;

export const ROUTE_PREFIXES = {
  admin: '/admin/',
} as const;

const MINIMIZED_APP_SHELL_PATTERNS = [
  ROUTE_PATHS.eventRegisterPattern,
  ROUTE_PATHS.eventPublicRegisterPattern,
  ROUTE_PATHS.adminEventAttendanceCheckInPattern,
] as const;

export function isMinimizedAppShellRoute(pathname: string): boolean {
  return MINIMIZED_APP_SHELL_PATTERNS.some((pattern) =>
    Boolean(matchPath({ path: pattern, end: true }, pathname)),
  );
}

export function toEventRegistration(slug: string): string {
  return `/events/${slug}/register`;
}

export function toEventPublicRegistration(slug: string): string {
  return `/events/${slug}/register-public`;
}

export function toAdminMemberDetail(memberId: string): string {
  return `/admin/members/${memberId}`;
}

export function toAdminMembersImport(): string {
  return '/admin/members/import';
}

export function toAdminEventDetail(eventId: string): string {
  return `/admin/events/${eventId}`;
}

export function toAdminEventFields(eventId: string): string {
  return `/admin/events/${eventId}/fields`;
}

export function toAdminEventAttendance(eventId: string): string {
  return `/admin/events/${eventId}/attendance`;
}

export function toAdminEventAttendanceCheckIn(eventId: string): string {
  return `/admin/events/${eventId}/attendance/check-in`;
}

export function toAdminEventAttendanceUnregisteredMembers(eventId: string): string {
  return `/admin/events/${eventId}/registrations/unregistered-members`;
}

export function toAdminEventAttendanceFields(eventId: string): string {
  return `/admin/events/${eventId}/attendance/fields`;
}

export function toAdminEventAttendanceData(eventId: string): string {
  return `/admin/events/${eventId}/attendance/data`;
}

export function toAdminEventAttendanceDataBulkUpload(eventId: string): string {
  return `/admin/events/${eventId}/attendance/data/bulk-upload`;
}

export function toAdminEventRegistrations(eventId: string): string {
  return `/admin/events/${eventId}/registrations`;
}

export function toAdminRegistrationNames(
  eventId: string,
  params: { fields: string[]; answerFields: string[] },
): string {
  const searchParams = new URLSearchParams();
  searchParams.set('fields', params.fields.join(','));
  if (params.answerFields.length > 0) {
    searchParams.set('answerFields', params.answerFields.join(','));
  }
  return `/admin/events/${eventId}/registrations/names?${searchParams.toString()}`;
}

export function toAdminEventPublicRegistrations(eventId: string): string {
  return `/admin/events/${eventId}/public-registrations`;
}

export function toAdminRegistrationDetail(eventId: string, registrationId: string): string {
  return `/admin/events/${eventId}/registrations/${registrationId}`;
}

export function toAdminPublicRegistrationDetail(eventId: string, registrationId: string): string {
  return `/admin/events/${eventId}/public-registrations/${registrationId}`;
}
