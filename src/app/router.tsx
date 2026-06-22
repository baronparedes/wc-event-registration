import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { AdminLoginPage } from '../pages/admin/AdminLoginPage'
import { AdminRegistrationsPage } from '../pages/admin/AdminRegistrationsPage'
import { AdminEventFieldsPage } from '../pages/admin/AdminEventFieldsPage'
import { AdminEventFormPage } from '../pages/admin/AdminEventFormPage'
import { AdminEventsPage } from '../pages/admin/AdminEventsPage'
import { HomePage } from '../pages/public/HomePage'
import { EventRegistrationPage } from '../pages/public/EventRegistrationPage'

function RequireAdminAuth({ children }: { children: ReactElement }) {
  const isAuthenticated = false

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
