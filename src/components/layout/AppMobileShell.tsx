import { useState } from 'react';

import { ChevronDown, Menu } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import brandLogo from '@/assets/wc-events-brand.png';
import { TOAST_MESSAGES, isMinimizedAppShellRoute } from '@/config/constants';

import { useAdminAuthQuery, useAdminLogoutMutation } from '../../hooks/domain/auth';
import { AppDrawerNavigation } from './AppDrawerNavigation';

function getCurrentUserLabel(email?: string | null, phone?: string | null, userId?: string) {
  return email ?? phone ?? userId ?? null;
}

export function AppMobileShell() {
  const location = useLocation();
  const { data: adminAuth } = useAdminAuthQuery();
  const logoutMutation = useAdminLogoutMutation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMinimizedShell = isMinimizedAppShellRoute(location.pathname);
  const currentUserLabel = getCurrentUserLabel(
    adminAuth?.session?.user?.email,
    adminAuth?.session?.user?.phone,
    adminAuth?.session?.user?.id,
  );

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      toast.success(TOAST_MESSAGES.adminSignOutSuccess);
    } catch (error) {
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.adminSignOutFailure;
      toast.error(message);
    }
  }

  return (
    <div className="min-h-screen bg-background text-text">
      {isMinimizedShell ? (
        <div className="sticky top-0 z-30 flex justify-center px-2 pt-1 print:hidden">
          <button
            type="button"
            aria-label="Open app navigation drawer"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface/95 px-2.5 py-1 text-[11px] font-semibold text-text shadow-sm backdrop-blur transition hover:bg-primary/10"
            onClick={() => setDrawerOpen(true)}
          >
            <ChevronDown className="h-4 w-4" />
            <span>Menu</span>
          </button>
        </div>
      ) : (
        <header className="sticky top-0 z-30 border-b border-border bg-surface print:hidden">
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open app navigation drawer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-text shadow-xs transition hover:bg-primary/10"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu className="h-6 w-6" />
                <span>Menu</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <AppDrawerNavigation
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAuthenticated={adminAuth?.isAuthenticated ?? false}
        adminRole={adminAuth?.adminRole ?? null}
        currentUserLabel={currentUserLabel}
        onLogout={handleLogout}
      />

      <main
        className={`relative mx-auto w-full max-w-6xl animate-fadeIn ${
          isMinimizedShell ? 'px-2 py-2 sm:px-3' : 'px-4 py-8'
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}
