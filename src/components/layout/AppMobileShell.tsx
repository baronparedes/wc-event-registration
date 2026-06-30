import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { toast } from 'sonner'
import { Menu, X } from 'lucide-react'
import { ROUTE_PATHS, ROUTE_PREFIXES, TOAST_MESSAGES } from '@/config/constants'
import brandLogo from '@/assets/wc-events-brand.png'
import { Button } from '../ui/Button'
import { useAdminAuthQuery, useAdminLogoutMutation } from '../../hooks/domain/auth'

export function AppMobileShell() {
  const navigate = useNavigate()
  const { data: adminAuth } = useAdminAuthQuery()
  const logoutMutation = useAdminLogoutMutation()
  const location = useLocation()
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleMobileNavigation = (path: string) => {
    setMobileMenuOpen(false)
    setAdminDropdownOpen(false)
    navigate(path)
  }

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

          {/* Mobile Menu Button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-border bg-surface/95 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-4 py-3">
            <button
              className="text-left rounded-md px-3.5 py-2 text-sm hover:bg-primary/10"
              onClick={() => handleMobileNavigation(ROUTE_PATHS.home)}
            >
              Events
            </button>
            <button
              className={`text-left rounded-md px-3.5 py-2 text-sm hover:bg-primary/10 ${isAdminPath ? 'bg-primary/10' : ''}`}
              onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
            >
              Admin
            </button>
            {adminDropdownOpen && (
              <div className="ml-4 flex flex-col gap-1">
                {adminAuth?.isAuthenticated ? (
                  <>
                    <button
                      className="text-left rounded-md px-3 py-2 text-sm hover:bg-primary/10"
                      onClick={() => handleMobileNavigation(ROUTE_PATHS.adminEvents)}
                    >
                      Events
                    </button>
                    <button
                      className="text-left rounded-md px-3 py-2 text-sm hover:bg-primary/10"
                      onClick={() => handleMobileNavigation(ROUTE_PATHS.adminMembers)}
                    >
                      Members
                    </button>
                  </>
                ) : (
                  <button
                    className="text-left rounded-md px-3 py-2 text-sm hover:bg-primary/10"
                    onClick={() => handleMobileNavigation(ROUTE_PATHS.adminLogin)}
                  >
                    Sign In
                  </button>
                )}
              </div>
            )}
            {adminAuth?.isAuthenticated && (
              <Button
                className="mt-2 self-start hover:bg-primary/10"
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Sign Out
              </Button>
            )}
          </div>
        </div>
      )}

      <main className="relative mx-auto w-full max-w-6xl animate-fadeIn px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
