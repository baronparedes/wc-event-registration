import { type ReactElement, Suspense, lazy } from 'react';

import { Navigate, Route, Routes } from 'react-router-dom';

import { Skeleton } from '@/components/ui/Skeleton';
import { ROUTE_PATHS } from '@/config/constants';
import { canWriteAdminData } from '@/lib/domain/auth';

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
const AdminLoginPage = lazy(() =>
  import('../pages/admin/login').then((module) => ({ default: module.AdminLoginPage })),
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
const AdminAttendanceUnregisteredMembersPage = lazy(() =>
  import('../pages/admin/events/[id]/attendance/unregistered-members').then((module) => ({
    default: module.AdminAttendanceUnregisteredMembersPage,
  })),
);
const AdminRegistrationsPage = lazy(() =>
  import('../pages/admin/events/[id]/registrations').then((module) => ({
    default: module.AdminRegistrationsPage,
  })),
);
const AdminPublicRegistrationsPage = lazy(() =>
  import('../pages/admin/events/[id]/public-registrations').then((module) => ({
    default: module.AdminPublicRegistrationsPage,
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

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const { data, isLoading } = useAdminAuthQuery();

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
    return <Navigate to={ROUTE_PATHS.adminLogin} replace />;
  }

  return children;
}

function RequireAdminWriteAccess({ children }: { children: ReactElement }) {
  const { data, isLoading } = useAdminAuthQuery();

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
    return <Navigate to={ROUTE_PATHS.adminLogin} replace />;
  }

  if (!canWriteAdminData(data?.adminRole)) {
    return <Navigate to={ROUTE_PATHS.adminEvents} replace />;
  }

  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<ResponsiveShellLayout />}>
        <Route
          path={ROUTE_PATHS.home}
          element={
            <LazyRoute>
              <HomePage />
            </LazyRoute>
          }
        />
        <Route
          path={ROUTE_PATHS.eventRegisterPattern}
          element={
            <LazyRoute>
              <EventRegistrationPage />
            </LazyRoute>
          }
        />
        <Route
          path={ROUTE_PATHS.eventPublicRegisterPattern}
          element={
            <LazyRoute>
              <PublicEventRegistrationPage />
            </LazyRoute>
          }
        />

        <Route
          path={ROUTE_PATHS.adminLogin}
          element={
            <LazyRoute>
              <AdminLoginPage />
            </LazyRoute>
          }
        />
        <Route
          path={ROUTE_PATHS.adminMembers}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminMembersPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminMembersImport}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminMembersImportPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminMemberDetailPattern}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminMemberDetailPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEvents}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminEventsPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventNew}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminNewEventPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventDetailPattern}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminEditEventPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventFieldsPattern}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminEventFieldsPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventAttendancePattern}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminEventAttendancePage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventAttendanceFieldsPattern}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminAttendanceFieldsPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventAttendanceDataPattern}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminAttendanceDataPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventAttendanceDataBulkUploadPattern}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminAttendanceDataBulkUploadPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventAttendanceCheckInPattern}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminAttendanceCheckInPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventAttendanceUnregisteredMembersPattern}
          element={
            <RequireAdminWriteAccess>
              <LazyRoute>
                <AdminAttendanceUnregisteredMembersPage />
              </LazyRoute>
            </RequireAdminWriteAccess>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventRegistrationsPattern}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminRegistrationsPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminPublicRegistrationDetailPattern}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminPublicRegistrationDetailPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventPublicRegistrationsPattern}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminPublicRegistrationsPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminRegistrationDetailPattern}
          element={
            <RequireAdminAuth>
              <LazyRoute>
                <AdminRegistrationDetailPage />
              </LazyRoute>
            </RequireAdminAuth>
          }
        />
      </Route>

      <Route
        path={ROUTE_PATHS.adminRegistrationNamesPattern}
        element={
          <RequireAdminAuth>
            <LazyRoute>
              <AdminRegistrationNamesPage />
            </LazyRoute>
          </RequireAdminAuth>
        }
      />

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
