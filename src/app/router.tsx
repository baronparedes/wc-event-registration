import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { useAdminAuthQuery } from '../hooks/domain/auth'
import { AdminLoginPage } from '../pages/admin/login'
import { AdminRegistrationsPage } from '../pages/admin/registrations'
import { AdminEventFieldsPage } from '../pages/admin/event-fields'
import { AdminEventFormPage } from '../pages/admin/event-form'
import { AdminEventsPage } from '../pages/admin/events'
import { HomePage } from '../pages/public/home'
import { EventRegistrationPage } from '../pages/public/event-registration'

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const { data, isLoading } = useAdminAuthQuery()

  if (isLoading) {
    return (
      <section className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        Checking admin access...
      </section>
    )
  }

  const isAuthenticated = data?.isAuthenticated ?? false

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/events/:slug/register" element={<EventRegistrationPage />} />

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin/events"
          element={
            <RequireAdminAuth>
              <AdminEventsPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin/events/new"
          element={
            <RequireAdminAuth>
              <AdminEventFormPage mode="create" />
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin/events/:id"
          element={
            <RequireAdminAuth>
              <AdminEventFormPage mode="edit" />
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin/events/:id/fields"
          element={
            <RequireAdminAuth>
              <AdminEventFieldsPage />
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin/events/:id/registrations"
          element={
            <RequireAdminAuth>
              <AdminRegistrationsPage />
            </RequireAdminAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
