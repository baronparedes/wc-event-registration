import {
  type ComponentType,
  type ReactElement,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from 'react';

import { WifiOff } from 'lucide-react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
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

import { AppMobileShell, AppShell } from '../components/layout';
import { useAdminAuthQuery } from '../hooks/domain/auth';
import { useIsMobileViewport } from '../hooks/utils';

const HomePage = lazy(() =>
  import('../pages/home').then((module) => ({ default: module.HomePage })),
);
const EventRegistrationPage = lazy(() =>
  import('../pages/events/[slug]/register').then((module) => ({
    default: module.EventRegistrationPage,
  })),
);
const PublicEventRegistrationPage = lazy(() =>
  import('../pages/events/[slug]/register-public').then((module) => ({
    default: module.PublicEventRegistrationPage,
  })),
);
const LoginPage = lazy(() =>
  import('../pages/login').then((module) => ({ default: module.LoginPage })),
);
const AdminMembersPage = lazy(() =>
  import('../pages/admin/members').then((module) => ({ default: module.AdminMembersPage })),
);
const AdminMemberMilestonesPage = lazy(() =>
  import('../pages/admin/members/milestones').then((module) => ({
    default: module.AdminMemberMilestonesPage,
  })),
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
const NotFoundPage = lazy(() =>
  import('../pages/not-found').then((module) => ({ default: module.NotFoundPage })),
);
const MemberProfilePage = lazy(() =>
  import('../pages/member/[id]').then((module) => ({ default: module.MemberProfilePage })),
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

function useBrowserOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

function isOfflineSupportedPath(pathname: string): boolean {
  return Boolean(
    matchPath({ path: ROUTE_PATHS.adminEventAttendanceDataPattern, end: true }, pathname),
  );
}

const routeComponents: Record<AppRouteKey, ComponentType> = {
  home: HomePage,
  eventRegister: EventRegistrationPage,
  eventPublicRegister: PublicEventRegistrationPage,
  login: LoginPage,
  adminMembers: AdminMembersPage,
  adminMemberMilestones: AdminMemberMilestonesPage,
  adminMembersImport: AdminMembersImportPage,
  adminMemberDetail: AdminMemberDetailPage,
  memberProfile: MemberProfilePage,
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
  const isOnline = useBrowserOnlineStatus();
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
  requiredPermission?: 'canReadAdminData' | 'canReadAdminMemberData';
}) {
  const { data, isLoading } = useAdminAuthQuery();
  const location = useLocation();
  const isOfflineAttendanceRoute =
    typeof navigator !== 'undefined' &&
    navigator.onLine === false &&
    isOfflineSupportedPath(location.pathname);

  if (isOfflineAttendanceRoute) {
    return children;
  }

  if (isLoading) {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-4/5" />
        </div>
      </section>
    );
  }

  const isAuthenticated = data?.isAuthenticated ?? false;

  if (!isAuthenticated) {
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    const searchParams = new URLSearchParams({ redirect: redirectTarget });
    return <Navigate to={`${ROUTE_PATHS.login}?${searchParams.toString()}`} replace />;
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

export function AppRouter() {
  return (
    <Routes>
      <Route element={<ResponsiveShellLayout />}>
        <Route element={<OfflineNavigationGuard />}>
          {APP_ROUTE_DEFINITIONS.filter((route) => route.layout === 'shell').map((route) => (
            <Route key={route.path} path={route.path} element={renderAppRoute(route)} />
          ))}
        </Route>
      </Route>

      <Route element={<OfflineNavigationGuard />}>
        {APP_ROUTE_DEFINITIONS.filter((route) => route.layout === 'standalone').map((route) => (
          <Route key={route.path} path={route.path} element={renderAppRoute(route)} />
        ))}
      </Route>

      <Route
        path={ROUTE_PATHS.notFound}
        element={
          <LazyRoute>
            <NotFoundPage />
          </LazyRoute>
        }
      />
    </Routes>
  );
}
