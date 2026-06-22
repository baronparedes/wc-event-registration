import { Link, Outlet } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminAuthQuery, useAdminLogoutMutation } from '../../hooks/admin'

export function AppShell() {
  const { data: adminAuth } = useAdminAuthQuery()
  const logoutMutation = useAdminLogoutMutation()

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync()
      toast.success('Signed out of admin session.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign out.'
      toast.error(message)
    }
  }

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="font-heading text-lg font-semibold text-text">WC Event Registration</p>
            <p className="text-xs text-muted">{new Date().toDateString()}</p>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link className="rounded-md px-3 py-1.5 hover:bg-primary/10" to="/">
              Public Events
            </Link>
            <Link className="rounded-md px-3 py-1.5 hover:bg-primary/10" to="/admin/events">
              Admin
            </Link>
            {adminAuth?.isAuthenticated ? (
              <button
                className="rounded-md border border-border px-3 py-1.5 hover:bg-primary/10"
                onClick={handleLogout}
                type="button"
              >
                Sign Out
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
