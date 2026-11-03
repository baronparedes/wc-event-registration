import { generatePath, matchPath } from 'react-router-dom';

import type { AdminPermissionKey } from '@/lib/domain/auth';

export const ROUTE_PATHS = {
  home: '/',
  privacy: '/privacy',
  privacyPolicy: '/privacy-policy',
  terms: '/terms',
  termsOfService: '/terms-of-service',
  notFound: '*',
  login: '/login',
  profile: '/profile',
  excuseRequest: '/excuse-request',
  longLeaveRequest: '/long-leave-request',
  forms: '/forms',
  formSubmitPattern: '/forms/:slug/submit',
  eventRegisterPattern: '/events/:slug/register',
  eventPublicRegisterPattern: '/events/:slug/register-public',
  eventCountdownPattern: '/events/:slug/countdown',
  adminHubCalendar: '/admin/hub-calendar',
  adminUserRoles: '/admin/settings/roles',
  adminMembers: '/admin/members',
  adminMembersDashboard: '/admin/members/dashboard',
  adminMembersImport: '/admin/members/import',
  adminMemberDetailPattern: '/admin/members/:id',
  adminMemberServiceAttendancePattern: '/admin/members/:id/service-attendance',
  adminMemberEventHistoryPattern: '/admin/members/:id/event-history',
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
  adminForms: '/admin/forms',
  adminFormNew: '/admin/forms/new',
  adminFormDetailPattern: '/admin/forms/:id',
  adminFormFieldsPattern: '/admin/forms/:id/fields',
  adminFormSubmissionsPattern: '/admin/forms/:id/submissions',
  hello: '/hello',
  adminChat: '/admin/chat',
  adminServices: '/admin/services',
  adminServiceAttendanceMigration: '/admin/services/attendance/migration',
  adminServiceAttendanceData: '/admin/services/attendance/data',
  adminServiceAttendanceCommitment: '/admin/services/attendance/commitment',
  adminServiceAttendanceForecast: '/admin/services/attendance/forecast',
  adminNotifications: '/admin/settings/notifications',
  adminNotificationsDashboard: '/admin/settings/notifications/dashboard',
  adminSundayReminders: '/admin/settings/notifications/sunday-reminders',
  adminSettings: '/admin/settings',
  adminSettingsEmailTemplates: '/admin/settings/email-templates',
  adminApprovals: '/admin/approvals',
  approvalReviewPattern: '/approvals/review/:token',
  recruitment: '/recruitment',
  recruitmentApply: '/recruitment/apply',
} as const;
export type AppRouteKey =
  | 'home'
  | 'privacy'
  | 'privacyPolicy'
  | 'terms'
  | 'termsOfService'
  | 'eventRegister'
  | 'eventPublicRegister'
  | 'eventCountdown'
  | 'login'
  | 'profile'
  | 'excuseRequest'
  | 'longLeaveRequest'
  | 'adminUserRoles'
  | 'adminMembers'
  | 'adminMembersDashboard'
  | 'adminMembersImport'
  | 'adminMemberDetail'
  | 'adminMemberServiceAttendance'
  | 'adminMemberEventHistory'
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
  | 'adminRegistrationNames'
  | 'adminForms'
  | 'adminFormNew'
  | 'adminFormDetail'
  | 'adminFormFields'
  | 'adminFormSubmissions'
  | 'formSubmit'
  | 'adminHubCalendar'
  | 'hello'
  | 'adminChat'
  | 'adminServices'
  | 'adminServiceAttendanceMigration'
  | 'adminServiceAttendanceData'
  | 'adminServiceAttendanceCommitment'
  | 'adminServiceAttendanceForecast'
  | 'adminNotifications'
  | 'adminNotificationsDashboard'
  | 'adminSundayReminders'
  | 'adminSettings'
  | 'adminSettingsEmailTemplates'
  | 'adminApprovals'
  | 'approvalReview'
  | 'recruitment'
  | 'recruitmentApply';

export type AppRouteDefinition = {
  key: AppRouteKey;
  path: string;
  layout: 'shell' | 'standalone';
  requiresAuth?: boolean;
  requiredPermission?: AdminPermissionKey | readonly AdminPermissionKey[];
};
export const APP_ROUTE_DEFINITIONS: AppRouteDefinition[] = [
  {
    key: 'adminApprovals',
    path: ROUTE_PATHS.adminApprovals,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'approvalReview',
    path: ROUTE_PATHS.approvalReviewPattern,
    layout: 'shell',
  },
  {
    key: 'adminHubCalendar',
    path: ROUTE_PATHS.adminHubCalendar,
    layout: 'shell',
    requiredPermission: 'canManageServices',
  },
  { key: 'home', path: ROUTE_PATHS.home, layout: 'shell' },
  { key: 'recruitment', path: ROUTE_PATHS.recruitment, layout: 'shell' },
  { key: 'recruitmentApply', path: ROUTE_PATHS.recruitmentApply, layout: 'shell' },
  { key: 'hello', path: ROUTE_PATHS.hello, layout: 'standalone' },
  { key: 'privacy', path: ROUTE_PATHS.privacy, layout: 'shell' },
  { key: 'privacyPolicy', path: ROUTE_PATHS.privacyPolicy, layout: 'shell' },
  { key: 'terms', path: ROUTE_PATHS.terms, layout: 'shell' },
  { key: 'termsOfService', path: ROUTE_PATHS.termsOfService, layout: 'shell' },
  { key: 'formSubmit', path: ROUTE_PATHS.formSubmitPattern, layout: 'shell' },
  { key: 'eventRegister', path: ROUTE_PATHS.eventRegisterPattern, layout: 'shell' },
  { key: 'eventPublicRegister', path: ROUTE_PATHS.eventPublicRegisterPattern, layout: 'shell' },
  { key: 'eventCountdown', path: ROUTE_PATHS.eventCountdownPattern, layout: 'standalone' },
  { key: 'login', path: ROUTE_PATHS.login, layout: 'shell' },
  { key: 'profile', path: ROUTE_PATHS.profile, layout: 'shell' },
  { key: 'excuseRequest', path: ROUTE_PATHS.excuseRequest, layout: 'shell' },
  { key: 'longLeaveRequest', path: ROUTE_PATHS.longLeaveRequest, layout: 'shell' },
  {
    key: 'adminUserRoles',
    path: ROUTE_PATHS.adminUserRoles,
    layout: 'shell',
    requiredPermission: 'canManageAdminRoles',
  },
  {
    key: 'adminMembers',
    path: ROUTE_PATHS.adminMembers,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'adminMembersDashboard',
    path: ROUTE_PATHS.adminMembersDashboard,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'adminMembersImport',
    path: ROUTE_PATHS.adminMembersImport,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminMemberDetail',
    path: ROUTE_PATHS.adminMemberDetailPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'adminMemberServiceAttendance',
    path: ROUTE_PATHS.adminMemberServiceAttendancePattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'adminMemberEventHistory',
    path: ROUTE_PATHS.adminMemberEventHistoryPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminMemberData',
  },
  {
    key: 'adminEvents',
    path: ROUTE_PATHS.adminEvents,
    layout: 'shell',
    requiredPermission: ['canReadAdminData', 'canAccessAttendanceCheckIn'],
  },
  {
    key: 'adminEventNew',
    path: ROUTE_PATHS.adminEventNew,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminEventDetail',
    path: ROUTE_PATHS.adminEventDetailPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminEventFields',
    path: ROUTE_PATHS.adminEventFieldsPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminEventAttendance',
    path: ROUTE_PATHS.adminEventAttendancePattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminAttendanceFields',
    path: ROUTE_PATHS.adminEventAttendanceFieldsPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminAttendanceData',
    path: ROUTE_PATHS.adminEventAttendanceDataPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminAttendanceDataBulkUpload',
    path: ROUTE_PATHS.adminEventAttendanceDataBulkUploadPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminAttendanceCheckIn',
    path: ROUTE_PATHS.adminEventAttendanceCheckInPattern,
    layout: 'shell',
    requiredPermission: 'canAccessAttendanceCheckIn',
  },
  {
    key: 'adminAttendanceDashboard',
    path: ROUTE_PATHS.adminEventAttendanceDashboardPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminAttendanceUnregisteredMembers',
    path: ROUTE_PATHS.adminEventRegistrationsUnregisteredMembersPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminRegistrationsBulkUpload',
    path: ROUTE_PATHS.adminEventRegistrationsBulkUploadPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminRegistrations',
    path: ROUTE_PATHS.adminEventRegistrationsPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminPublicRegistrationDetail',
    path: ROUTE_PATHS.adminPublicRegistrationDetailPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminPublicRegistrations',
    path: ROUTE_PATHS.adminEventPublicRegistrationsPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminPublicRegistrationsBulkUpload',
    path: ROUTE_PATHS.adminEventPublicRegistrationsBulkUploadPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminRegistrationDetail',
    path: ROUTE_PATHS.adminRegistrationDetailPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminRegistrationNames',
    path: ROUTE_PATHS.adminRegistrationNamesPattern,
    layout: 'standalone',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminForms',
    path: ROUTE_PATHS.adminForms,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminFormNew',
    path: ROUTE_PATHS.adminFormNew,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminFormDetail',
    path: ROUTE_PATHS.adminFormDetailPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminFormFields',
    path: ROUTE_PATHS.adminFormFieldsPattern,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminFormSubmissions',
    path: ROUTE_PATHS.adminFormSubmissionsPattern,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminChat',
    path: ROUTE_PATHS.adminChat,
    layout: 'shell',
    requiredPermission: 'canReadAdminData',
  },
  {
    key: 'adminServices',
    path: ROUTE_PATHS.adminServices,
    layout: 'shell',
    requiredPermission: 'canManageServices',
  },
  {
    key: 'adminServiceAttendanceMigration',
    path: ROUTE_PATHS.adminServiceAttendanceMigration,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminServiceAttendanceData',
    path: ROUTE_PATHS.adminServiceAttendanceData,
    layout: 'shell',
    requiredPermission: 'canManageServices',
  },
  {
    key: 'adminServiceAttendanceCommitment',
    path: ROUTE_PATHS.adminServiceAttendanceCommitment,
    layout: 'shell',
    requiredPermission: 'canManageServices',
  },
  {
    key: 'adminServiceAttendanceForecast',
    path: ROUTE_PATHS.adminServiceAttendanceForecast,
    layout: 'shell',
    requiredPermission: 'canManageServices',
  },
  {
    key: 'adminNotifications',
    path: ROUTE_PATHS.adminNotifications,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminNotificationsDashboard',
    path: ROUTE_PATHS.adminNotificationsDashboard,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminSundayReminders',
    path: ROUTE_PATHS.adminSundayReminders,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminSettings',
    path: ROUTE_PATHS.adminSettings,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
  {
    key: 'adminSettingsEmailTemplates',
    path: ROUTE_PATHS.adminSettingsEmailTemplates,
    layout: 'shell',
    requiredPermission: 'canWriteAdminData',
  },
];
export const ROUTE_PREFIXES = {
  admin: '/admin/',
} as const;
const MINIMIZED_APP_SHELL_PATTERNS = [
  ROUTE_PATHS.eventRegisterPattern,
  ROUTE_PATHS.eventPublicRegisterPattern,
  ROUTE_PATHS.eventCountdownPattern,
  ROUTE_PATHS.formSubmitPattern,
  ROUTE_PATHS.excuseRequest,
  ROUTE_PATHS.longLeaveRequest,
  ROUTE_PATHS.recruitmentApply,
  ROUTE_PATHS.approvalReviewPattern,
  ROUTE_PATHS.adminEventAttendanceCheckInPattern,
  ROUTE_PATHS.hello,
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
