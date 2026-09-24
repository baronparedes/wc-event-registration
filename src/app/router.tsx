/* eslint-disable react-refresh/only-export-components */
import { type ComponentType, type ReactElement, Suspense, lazy, useEffect, useRef } from 'react';

import { WifiOff } from 'lucide-react';
import {
  Navigate,
  Outlet,
  createBrowserRouter,
  matchPath,
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { Button, Skeleton } from '@/components/ui';
import {
  APP_ROUTE_DEFINITIONS,
  type AppRouteDefinition,
  type AppRouteKey,
  ROUTE_PATHS,
} from '@/config/constants';
import type { AdminRole } from '@/lib/domain/auth';
import { canAdminPerform } from '@/lib/domain/auth';

import { RouteErrorBoundary } from '../components/RouteErrorBoundary';
import { AppMobileShell, AppShell } from '../components/layout';
import { useAdminAuthQuery } from '../hooks/domain/auth';
import { useIsMobileViewport, useOnlineStatus } from '../hooks/utils';

const HomePage = lazy(() =>
  import('../pages/home').then((module) => ({ default: module.HomePage })),
);
const HelloCarouselPage = lazy(() =>
  import('../pages/hello').then((module) => ({ default: module.HelloCarouselPage })),
);
const PrivacyPolicyPage = lazy(() =>
  import('../pages/privacy').then((module) => ({ default: module.PrivacyPolicyPage })),
);
const TermsOfServicePage = lazy(() =>
  import('../pages/terms').then((module) => ({ default: module.TermsOfServicePage })),
);
const EventRegistrationPage = lazy(() =>
  import('../pages/events/[slug]/register').then((module) => ({
    default: module.EventRegistrationPage,
  })),
);
const EventCountdownPage = lazy(() =>
  import('../pages/events/[slug]/countdown').then((module) => ({
    default: module.EventCountdownPage,
  })),
);
const PublicEventRegistrationPage = lazy(() =>
  import('../pages/events/[slug]/register-public').then((module) => ({
    default: module.PublicEventRegistrationPage,
  })),
);
const FormSubmissionPage = lazy(() =>
  import('../pages/forms/[slug]/submit').then((module) => ({
    default: module.FormSubmissionPage,
  })),
);
const LoginPage = lazy(() =>
  import('../pages/login').then((module) => ({ default: module.LoginPage })),
);
const ProfilePage = lazy(() =>
  import('../pages/profile').then((module) => ({ default: module.ProfilePage })),
);
const AdminHubCalendarPage = lazy(() =>
  import('../pages/admin/hub-calendar').then((module) => ({
    default: module.AdminHubCalendarPage,
  })),
);
const AdminUserRolesPage = lazy(() =>
  import('../pages/admin/users/roles').then((module) => ({
    default: module.AdminUserRolesPage,
  })),
);
const AdminMembersPage = lazy(() =>
  import('../pages/admin/members').then((module) => ({ default: module.AdminMembersPage })),
);
const AdminMembersImportPage = lazy(() =>
  import('../pages/admin/members/import/index').then((module) => ({
    default: module.AdminMembersImportPage,
  })),
);
const AdminMemberDetailPage = lazy(() =>
  import('../pages/admin/members/[id]').then((module) => ({
    default: module.AdminMemberDetailPage,
  })),
);
const AdminMemberServiceAttendancePage = lazy(() =>
  import('../pages/admin/members/[id]/service-attendance').then((module) => ({
    default: module.AdminMemberServiceAttendancePage,
  })),
);
const AdminChatPage = lazy(() =>
  import('@/pages/admin/chat').then((module) => ({ default: module.AdminChatPage })),
);
const AdminServicesPage = lazy(() =>
  import('../pages/admin/services').then((module) => ({
    default: module.AdminServicesPage,
  })),
);
const AdminServiceAttendanceMigrationPage = lazy(() =>
  import('../pages/admin/services/attendance/migration').then((module) => ({
    default: module.AdminServiceAttendanceMigrationPage,
  })),
);

const AdminEventsPage = lazy(() =>
  import('../pages/admin/events').then((module) => ({ default: module.AdminEventsPage })),
);
const AdminNewEventPage = lazy(() =>
  import('../pages/admin/events/new').then((module) => ({ default: module.AdminNewEventPage })),
);
const AdminEditEventPage = lazy(() =>
  import('../pages/admin/events/[id]').then((module) => ({ default: module.AdminEditEventPage })),
);
const AdminEventFieldsPage = lazy(() =>
  import('../pages/admin/events/[id]/fields').then((module) => ({
    default: module.AdminEventFieldsPage,
  })),
);
const AdminEventAttendancePage = lazy(() =>
  import('../pages/admin/events/[id]/attendance').then((module) => ({
    default: module.AdminEventAttendancePage,
  })),
);
const AdminAttendanceFieldsPage = lazy(() =>
  import('../pages/admin/events/[id]/attendance/fields').then((module) => ({
    default: module.AdminAttendanceFieldsPage,
  })),
);
const AdminAttendanceDataPage = lazy(() =>
  import('../pages/admin/events/[id]/attendance/data').then((module) => ({
    default: module.AdminAttendanceDataPage,
  })),
);
const AdminAttendanceDataBulkUploadPage = lazy(() =>
  import('../pages/admin/events/[id]/attendance/data/bulk-upload').then((module) => ({
    default: module.AdminAttendanceDataBulkUploadPage,
  })),
);
const AdminAttendanceCheckInPage = lazy(() =>
  import('../pages/admin/events/[id]/attendance/check-in').then((module) => ({
    default: module.AdminAttendanceCheckInPage,
  })),
);
const AdminAttendanceDashboardPage = lazy(() =>
  import('../pages/admin/events/[id]/attendance/dashboard').then((module) => ({
    default: module.AdminAttendanceDashboardPage,
  })),
);
const AdminAttendanceUnregisteredMembersPage = lazy(() =>
  import('../pages/admin/events/[id]/registrations/unregistered-members').then((module) => ({
    default: module.AdminUnregisteredMembersPage,
  })),
);
const AdminRegistrationsPage = lazy(() =>
  import('../pages/admin/events/[id]/registrations').then((module) => ({
    default: module.AdminRegistrationsPage,
  })),
);
const AdminRegistrationsBulkUploadPage = lazy(() =>
  import('../pages/admin/events/[id]/registrations/bulk-upload').then((module) => ({
    default: module.AdminRegistrationsBulkUploadPage,
  })),
);
const AdminPublicRegistrationsPage = lazy(() =>
  import('../pages/admin/events/[id]/public-registrations').then((module) => ({
    default: module.AdminPublicRegistrationsPage,
  })),
);
const AdminPublicRegistrationsBulkUploadPage = lazy(() =>
  import('../pages/admin/events/[id]/public-registrations/bulk-upload').then((module) => ({
    default: module.AdminPublicRegistrationsBulkUploadPage,
  })),
);
const AdminPublicRegistrationDetailPage = lazy(() =>
  import('../pages/admin/events/[id]/public-registrations/[registration_id]').then((module) => ({
    default: module.AdminPublicRegistrationDetailPage,
  })),
);
const AdminRegistrationDetailPage = lazy(() =>
  import('../pages/admin/events/[id]/registrations/[registration_id]').then((module) => ({
    default: module.AdminRegistrationDetailPage,
  })),
);
const AdminRegistrationNamesPage = lazy(() =>
  import('../pages/admin/events/[id]/registrations/names').then((module) => ({
    default: module.AdminRegistrationNamesPage,
  })),
);
const AdminFormsPage = lazy(() =>
  import('../pages/admin/forms').then((module) => ({ default: module.AdminFormsPage })),
);
const AdminNewFormPage = lazy(() =>
  import('../pages/admin/forms/new').then((module) => ({ default: module.AdminNewFormPage })),
);
const AdminEditFormPage = lazy(() =>
  import('../pages/admin/forms/[id]').then((module) => ({ default: module.AdminEditFormPage })),
);
const AdminFormFieldsPage = lazy(() =>
  import('../pages/admin/forms/[id]/fields').then((module) => ({
    default: module.AdminFormFieldsPage,
  })),
);
const AdminFormSubmissionsPage = lazy(() =>
  import('../pages/admin/forms/[id]/submissions').then((module) => ({
    default: module.AdminFormSubmissionsPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('../pages/not-found').then((module) => ({ default: module.NotFoundPage })),
);
const AdminMemberEventHistoryPage = lazy(() =>
  import('../pages/admin/members/[id]/event-history').then((module) => ({
    default: module.AdminMemberEventHistoryPage,
  })),
);
const AdminServiceAttendanceDataPage = lazy(() =>
  import('../pages/admin/services/attendance/data').then((module) => ({
    default: module.AdminServiceAttendanceDataPage,
  })),
);
const AdminServiceAttendanceCommitmentPage = lazy(() =>
  import('../pages/admin/services/attendance/commitment').then((module) => ({
    default: module.AdminServiceAttendanceCommitmentPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <section className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </section>
  );
}

function LazyRoute({ children }: { children: ReactElement }) {
  return <Suspense fallback={<RouteLoadingFallback />}>{children}</Suspense>;
}

function ResponsiveShellLayout() {
  const isMobile = useIsMobileViewport();
  return isMobile ? <AppMobileShell /> : <AppShell />;
}

function isOfflineSupportedPath(pathname: string): boolean {
  return Boolean(
    matchPath({ path: ROUTE_PATHS.adminEventAttendanceDataPattern, end: true }, pathname) ||
    matchPath({ path: ROUTE_PATHS.adminEventAttendanceCheckInPattern, end: true }, pathname),
  );
}

const routeComponents: Record<AppRouteKey, ComponentType> = {
  home: HomePage,
  adminHubCalendar: AdminHubCalendarPage,
  hello: HelloCarouselPage,
  privacy: PrivacyPolicyPage,
  privacyPolicy: PrivacyPolicyPage,
  terms: TermsOfServicePage,
  termsOfService: TermsOfServicePage,
  eventRegister: EventRegistrationPage,
  eventPublicRegister: PublicEventRegistrationPage,
  eventCountdown: EventCountdownPage,
  login: LoginPage,
  profile: ProfilePage,
  adminUserRoles: AdminUserRolesPage,
  adminMembers: AdminMembersPage,
  adminMembersImport: AdminMembersImportPage,
  adminMemberDetail: AdminMemberDetailPage,
  adminMemberServiceAttendance: AdminMemberServiceAttendancePage,
  adminMemberEventHistory: AdminMemberEventHistoryPage,
  adminChat: AdminChatPage,
  adminEvents: AdminEventsPage,
  adminEventNew: AdminNewEventPage,
  adminEventDetail: AdminEditEventPage,
  adminEventFields: AdminEventFieldsPage,
  adminEventAttendance: AdminEventAttendancePage,
  adminAttendanceFields: AdminAttendanceFieldsPage,
  adminAttendanceData: AdminAttendanceDataPage,
  adminAttendanceDataBulkUpload: AdminAttendanceDataBulkUploadPage,
  adminAttendanceCheckIn: AdminAttendanceCheckInPage,
  adminAttendanceDashboard: AdminAttendanceDashboardPage,
  adminAttendanceUnregisteredMembers: AdminAttendanceUnregisteredMembersPage,
  adminRegistrationsBulkUpload: AdminRegistrationsBulkUploadPage,
  adminRegistrations: AdminRegistrationsPage,
  adminPublicRegistrationDetail: AdminPublicRegistrationDetailPage,
  adminPublicRegistrations: AdminPublicRegistrationsPage,
  adminPublicRegistrationsBulkUpload: AdminPublicRegistrationsBulkUploadPage,
  adminRegistrationDetail: AdminRegistrationDetailPage,
  adminRegistrationNames: AdminRegistrationNamesPage,
  adminForms: AdminFormsPage,
  adminFormNew: AdminNewFormPage,
  adminFormDetail: AdminEditFormPage,
  adminFormFields: AdminFormFieldsPage,
  adminFormSubmissions: AdminFormSubmissionsPage,
  formSubmit: FormSubmissionPage,
  adminServices: AdminServicesPage,
  adminServiceAttendanceMigration: AdminServiceAttendanceMigrationPage,
  adminServiceAttendanceData: AdminServiceAttendanceDataPage,
  adminServiceAttendanceCommitment: AdminServiceAttendanceCommitmentPage,
};

function OfflineNavigationFallback({ onGoBack }: { onGoBack: () => void }) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center justify-center space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <WifiOff className="h-10 w-10 text-amber-700" aria-hidden="true" />
      <h1 className="text-2xl font-semibold text-amber-950">You are offline</h1>
      <p className="text-sm text-amber-800">
        Only the prepared Attendance Data view is available without a connection. Return to the
        previous page or reconnect to continue.
      </p>
      <Button onClick={onGoBack} variant="primaryOutline">
        Go Back
      </Button>
    </section>
  );
}

function OfflineNavigationGuard() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const lastSupportedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOfflineSupportedPath(location.pathname)) {
      lastSupportedPathRef.current = `${location.pathname}${location.search}${location.hash}`;
    }
  }, [location.hash, location.pathname, location.search]);

  if (isOnline || isOfflineSupportedPath(location.pathname)) {
    return <Outlet />;
  }

  function handleGoBack() {
    const lastSupportedPath = lastSupportedPathRef.current;
    if (lastSupportedPath) {
      navigate(lastSupportedPath, { replace: true });
      return;
    }

    navigate(-1);
  }

  return <OfflineNavigationFallback onGoBack={handleGoBack} />;
}

function RequireAdminAuth({
  children,
  allowedRoles,
  requiredPermission,
}: {
  children: ReactElement;
  allowedRoles?: readonly AdminRole[];
  requiredPermission?: 'canReadAdminData' | 'canReadAdminMemberData' | 'canManageAdminRoles';
}) {
  const { data, isLoading } = useAdminAuthQuery();
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const isOfflineAttendanceRoute = !isOnline && isOfflineSupportedPath(location.pathname);

  if (isOfflineAttendanceRoute) {
    return children;
  }

  if (isLoading) {
    // Avoid rendering full-page skeletons to prevent double layout shifts
    // during route chunk resolutions.
    return null;
  }

  const isAuthenticated = data?.isAuthenticated ?? false;
  const hasSession = Boolean(data?.session);

  if (!hasSession) {
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    const searchParams = new URLSearchParams({ redirect: redirectTarget });
    return <Navigate to={`${ROUTE_PATHS.login}?${searchParams.toString()}`} replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }

  if (allowedRoles) {
    if (!data?.adminRole || !allowedRoles.includes(data.adminRole)) {
      return <Navigate to={ROUTE_PATHS.adminEvents} replace />;
    }
  } else if (
    requiredPermission
      ? !canAdminPerform(data?.adminRole, requiredPermission)
      : !canAdminPerform(data?.adminRole, 'canReadAdminData')
  ) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }

  return children;
}

function renderAppRoute({
  key,
  requiresAuth,
  allowedRoles,
  requiredPermission,
}: AppRouteDefinition): ReactElement {
  const Component = routeComponents[key];
  const page = (
    <LazyRoute>
      <Component />
    </LazyRoute>
  );

  return requiresAuth || allowedRoles || requiredPermission !== undefined ? (
    <RequireAdminAuth allowedRoles={allowedRoles} requiredPermission={requiredPermission}>
      {page}
    </RequireAdminAuth>
  ) : (
    page
  );
}

export const appRouter = createBrowserRouter([
  {
    element: <ResponsiveShellLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <OfflineNavigationGuard />,
        children: APP_ROUTE_DEFINITIONS.filter((route) => route.layout === 'shell').map(
          (route) => ({
            path: route.path,
            element: renderAppRoute(route),
          }),
        ),
      },
    ],
  },
  {
    element: <OfflineNavigationGuard />,
    errorElement: <RouteErrorBoundary />,
    children: APP_ROUTE_DEFINITIONS.filter((route) => route.layout === 'standalone').map(
      (route) => ({
        path: route.path,
        element: renderAppRoute(route),
      }),
    ),
  },
  {
    path: ROUTE_PATHS.notFound,
    element: (
      <LazyRoute>
        <NotFoundPage />
      </LazyRoute>
    ),
    errorElement: <RouteErrorBoundary />,
  },
]);
