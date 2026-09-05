import { generatePath, matchPath } from 'react-router-dom';

import type { AdminRole } from '@/lib/domain/auth';

export const ROUTE_PATHS = {
  home: '/',
  privacy: '/privacy',
  privacyPolicy: '/privacy-policy',
  terms: '/terms',
  termsOfService: '/terms-of-service',
  notFound: '*',
  login: '/login',
  eventRegisterPattern: '/events/:slug/register',
  eventPublicRegisterPattern: '/events/:slug/register-public',
  adminMembers: '/admin/members',
  adminMemberMilestones: '/admin/members/milestones',
  adminMembersImport: '/admin/members/import',
  adminMemberDetailPattern: '/admin/members/:id',
  memberDetailPattern: '/member/:id',
  adminEvents: '/admin/events',
  adminEventNew: '/admin/events/new',
  adminEventDetailPattern: '/admin/events/:id',
  adminEventAttendancePattern: '/admin/events/:id/attendance',
  adminEventAttendanceCheckInPattern: '/admin/events/:id/attendance/check-in',
  adminEventAttendanceFieldsPattern: '/admin/events/:id/attendance/fields',
  adminEventAttendanceDashboardPattern: '/admin/events/:id/attendance/dashboard',
  adminEventAttendanceDataPattern: '/admin/events/:id/attendance/data',
  adminEventAttendanceDataBulkUploadPattern: '/admin/events/:id/attendance/data/bulk-upload',
  adminEventFieldsPattern: '/admin/events/:id/fields',
  adminEventRegistrationsPattern: '/admin/events/:id/registrations',
  adminEventRegistrationsBulkUploadPattern: '/admin/events/:id/registrations/bulk-upload',
  adminEventPublicRegistrationsBulkUploadPattern:
    '/admin/events/:id/public-registrations/bulk-upload',
  adminEventRegistrationsUnregisteredMembersPattern:
    '/admin/events/:id/registrations/unregistered-members',
  adminRegistrationNamesPattern: '/admin/events/:id/registrations/names',
  adminEventPublicRegistrationsPattern: '/admin/events/:id/public-registrations',
  adminRegistrationDetailPattern: '/admin/events/:id/registrations/:registration_id',
  adminPublicRegistrationDetailPattern: '/admin/events/:id/public-registrations/:registration_id',
} as const;

export type AppRouteKey =
  | 'home'
  | 'privacy'
  | 'privacyPolicy'
  | 'terms'
  | 'termsOfService'
  | 'eventRegister'
  | 'eventPublicRegister'
  | 'login'
  | 'adminMembers'
  | 'adminMemberMilestones'
  | 'adminMembersImport'
  | 'adminMemberDetail'
  | 'memberProfile'
  | 'adminEvents'
  | 'adminEventNew'
  | 'adminEventDetail'
  | 'adminEventFields'
  | 'adminEventAttendance'
  | 'adminAttendanceFields'
  | 'adminAttendanceData'
  | 'adminAttendanceDataBulkUpload'
  | 'adminAttendanceCheckIn'
  | 'adminAttendanceDashboard'
  | 'adminAttendanceUnregisteredMembers'
  | 'adminRegistrationsBulkUpload'
  | 'adminRegistrations'
  | 'adminPublicRegistrationDetail'
  | 'adminPublicRegistrations'
  | 'adminPublicRegistrationsBulkUpload'
  | 'adminRegistrationDetail'
  | 'adminRegistrationNames';

export type AppRouteDefinition = {
  key: AppRouteKey;
  path: string;
  layout: 'shell' | 'standalone';
  requiresAuth?: boolean;
  allowedRoles?: readonly AdminRole[];
  requiredPermission?: 'canReadAdminData' | 'canReadAdminMemberData';
};

export const APP_ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  { key: 'home', path: ROUTE_PATHS.home, layout: 'shell' },
  { key: 'privacy', path: ROUTE_PATHS.privacy, layout: 'shell' },
  { key: 'privacyPolicy', path: ROUTE_PATHS.privacyPolicy, layout: 'shell' },
  { key: 'terms', path: ROUTE_PATHS.terms, layout: 'shell' },
  { key: 'termsOfService', path: ROUTE_PATHS.termsOfService, layout: 'shell' },
  { key: 'eventRegister', path: ROUTE_PATHS.eventRegisterPattern, layout: 'shell' },
  { key: 'eventPublicRegister', path: ROUTE_PATHS.eventPublicRegisterPattern, layout: 'shell' },
  { key: 'login', path: ROUTE_PATHS.login, layout: 'shell' },
  {
    key: 'adminMembers',
    path: ROUTE_PATHS.adminMembers,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'adminMemberMilestones',
    path: ROUTE_PATHS.adminMemberMilestones,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'adminMembersImport',
    path: ROUTE_PATHS.adminMembersImport,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminMemberDetail',
    path: ROUTE_PATHS.adminMemberDetailPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'memberProfile',
    path: ROUTE_PATHS.memberDetailPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin', 'slod'],
  },
  {
    key: 'adminEvents',
    path: ROUTE_PATHS.adminEvents,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin', 'slod', 'kiosk'],
  },
  {
    key: 'adminEventNew',
    path: ROUTE_PATHS.adminEventNew,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminEventDetail',
    path: ROUTE_PATHS.adminEventDetailPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminEventFields',
    path: ROUTE_PATHS.adminEventFieldsPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminEventAttendance',
    path: ROUTE_PATHS.adminEventAttendancePattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminAttendanceFields',
    path: ROUTE_PATHS.adminEventAttendanceFieldsPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminAttendanceData',
    path: ROUTE_PATHS.adminEventAttendanceDataPattern,
    layout: 'shell',
    requiresAuth: true,
  },
  {
    key: 'adminAttendanceDataBulkUpload',
    path: ROUTE_PATHS.adminEventAttendanceDataBulkUploadPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminAttendanceCheckIn',
    path: ROUTE_PATHS.adminEventAttendanceCheckInPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin', 'kiosk'],
  },
  {
    key: 'adminAttendanceDashboard',
    path: ROUTE_PATHS.adminEventAttendanceDashboardPattern,
    layout: 'shell',
    requiresAuth: true,
  },
  {
    key: 'adminAttendanceUnregisteredMembers',
    path: ROUTE_PATHS.adminEventRegistrationsUnregisteredMembersPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminRegistrationsBulkUpload',
    path: ROUTE_PATHS.adminEventRegistrationsBulkUploadPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminRegistrations',
    path: ROUTE_PATHS.adminEventRegistrationsPattern,
    layout: 'shell',
    requiresAuth: true,
  },
  {
    key: 'adminPublicRegistrationDetail',
    path: ROUTE_PATHS.adminPublicRegistrationDetailPattern,
    layout: 'shell',
    requiresAuth: true,
  },
  {
    key: 'adminPublicRegistrations',
    path: ROUTE_PATHS.adminEventPublicRegistrationsPattern,
    layout: 'shell',
    requiresAuth: true,
  },
  {
    key: 'adminPublicRegistrationsBulkUpload',
    path: ROUTE_PATHS.adminEventPublicRegistrationsBulkUploadPattern,
    layout: 'shell',
    allowedRoles: ['admin', 'super_admin'],
  },
  {
    key: 'adminRegistrationDetail',
    path: ROUTE_PATHS.adminRegistrationDetailPattern,
    layout: 'shell',
    requiresAuth: true,
  },
  {
    key: 'adminRegistrationNames',
    path: ROUTE_PATHS.adminRegistrationNamesPattern,
    layout: 'standalone',
    requiresAuth: true,
  },
];

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

type RouteParams = Record<string, string>;
type RouteQuery = Record<string, string | undefined>;

function getAppRoutePath(routeKey: AppRouteKey): string {
  const route = APP_ROUTE_DEFINITIONS.find((definition) => definition.key === routeKey);
  if (!route) {
    throw new Error(`Unknown application route: ${routeKey}`);
  }

  return route.path;
}

export function toRoute(routeKey: AppRouteKey, params: RouteParams = {}): string {
  return generatePath(getAppRoutePath(routeKey), params);
}

export function toRouteWithQuery(
  routeKey: AppRouteKey,
  params: RouteParams,
  query: RouteQuery,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      searchParams.set(key, value);
    }
  }

  const search = searchParams.toString();
  return search ? `${toRoute(routeKey, params)}?${search}` : toRoute(routeKey, params);
}
