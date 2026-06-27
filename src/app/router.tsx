import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ROUTE_PATHS } from '@/config/constants'
import { AppShell } from '../components/layout/AppShell'
import { useAdminAuthQuery } from '../hooks/domain/auth'
import { AdminLoginPage } from '../pages/admin/login'
import { AdminMembersPage } from '../pages/admin/members'
import { AdminMemberDetailPage } from '../pages/admin/members/[id]'
import { AdminRegistrationsPage } from '../pages/admin/events/[id]/registrations'
import { AdminRegistrationDetailPage } from '../pages/admin/events/[id]/registrations/[registration_id]'
import { AdminEventFieldsPage } from '../pages/admin/events/[id]/fields'
import { AdminEditEventPage } from '../pages/admin/events/[id]'
import { AdminNewEventPage } from '../pages/admin/events/new'
import { AdminEventsPage } from '../pages/admin/events'
import { HomePage } from '../pages/home'
import { EventRegistrationPage } from '../pages/events/[slug]/register'
import { NotFoundPage } from '../pages/not-found'

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const { data, isLoading } = useAdminAuthQuery()

  if (isLoading) {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-4/5" />
        </div>
      </section>
    )
  }

  const isAuthenticated = data?.isAuthenticated ?? false

  if (!isAuthenticated) {
    return <Navigate to={ROUTE_PATHS.adminLogin} replace />
  }

  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={ROUTE_PATHS.home} element={<HomePage />} />
        <Route path={ROUTE_PATHS.eventRegisterPattern} element={<EventRegistrationPage />} />

        <Route path={ROUTE_PATHS.adminLogin} element={<AdminLoginPage />} />
        <Route
          path={ROUTE_PATHS.adminMembers}
          element={
            <RequireAdminAuth>
              <AdminMembersPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminMemberDetailPattern}
          element={
            <RequireAdminAuth>
              <AdminMemberDetailPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEvents}
          element={
            <RequireAdminAuth>
              <AdminEventsPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventNew}
          element={
            <RequireAdminAuth>
              <AdminNewEventPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventDetailPattern}
          element={
            <RequireAdminAuth>
              <AdminEditEventPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventFieldsPattern}
          element={
            <RequireAdminAuth>
              <AdminEventFieldsPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminEventRegistrationsPattern}
          element={
            <RequireAdminAuth>
              <AdminRegistrationsPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path={ROUTE_PATHS.adminRegistrationDetailPattern}
          element={
            <RequireAdminAuth>
              <AdminRegistrationDetailPage />
            </RequireAdminAuth>
          }
        />
      </Route>

      <Route path={ROUTE_PATHS.notFound} element={<NotFoundPage />} />
    </Routes>
  )
}
