import { Link, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { ROUTE_PATHS, ROUTE_PREFIXES, TOAST_MESSAGES } from '@/config/constants'
import brandLogo from '@/assets/wc-events-brand.png'
import { Button } from '../ui/Button'
import { DropdownMenu, DropdownMenuItem } from '../ui/DropdownMenu'
import { useAdminAuthQuery, useAdminLogoutMutation } from '../../hooks/domain/auth'

export function AppShell() {
  const { data: adminAuth } = useAdminAuthQuery()
  const logoutMutation = useAdminLogoutMutation()
  const location = useLocation()
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync()
      toast.success(TOAST_MESSAGES.adminSignOutSuccess)
    } catch (error) {
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.adminSignOutFailure
      toast.error(message)
    }
  }

  const isAdminPath = location.pathname.startsWith(ROUTE_PREFIXES.admin)

  return (
    <div className="min-h-screen bg-background text-text">
      <header className="relative z-30 border-b border-border bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <img src={brandLogo} alt="WC Events" className="h-12 w-12" />
            <div>
              <p
                id="app-shell-title-anchor"
                className="font-heading text-2xl font-semibold text-text"
              >
                WC Event Registrations
              </p>
              <p className="text-sm text-muted">{new Date().toDateString()}</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="flex items-center gap-2.5 text-sm">
            <Link className="rounded-md px-3.5 py-2 hover:bg-primary/10" to={ROUTE_PATHS.home}>
              Events
            </Link>
            <DropdownMenu
              open={adminDropdownOpen}
              onOpenChange={setAdminDropdownOpen}
              trigger={
                <button
                  onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                  className={`rounded-md px-3.5 py-2 hover:bg-primary/10 ${isAdminPath ? 'bg-primary/10' : ''}`}
                >
                  Admin
                </button>
              }
            >
              {adminAuth?.isAuthenticated ? (
                <>
                  <DropdownMenuItem
                    to={ROUTE_PATHS.adminEvents}
                    onClick={() => setAdminDropdownOpen(false)}
                  >
                    Events
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    to={ROUTE_PATHS.adminMembers}
                    onClick={() => setAdminDropdownOpen(false)}
                  >
                    Members
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  to={ROUTE_PATHS.adminLogin}
                  onClick={() => setAdminDropdownOpen(false)}
                >
                  Sign In
                </DropdownMenuItem>
              )}
            </DropdownMenu>
            {adminAuth?.isAuthenticated && (
              <Button
                className="hover:bg-primary/10"
                onClick={handleLogout}
                size="sm"
                type="button"
                variant="outline"
              >
                Sign Out
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-0 mx-auto w-full max-w-6xl animate-fadeIn px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
