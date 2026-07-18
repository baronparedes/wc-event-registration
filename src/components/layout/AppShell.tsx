import { useState } from 'react';

import { Menu } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { toast } from 'sonner';

import brandLogo from '@/assets/wc-events-brand.png';
import { TOAST_MESSAGES } from '@/config/constants';

import { useAdminAuthQuery, useAdminLogoutMutation } from '../../hooks/domain/auth';
import { AppDrawerNavigation } from './AppDrawerNavigation';

export function AppShell() {
  const { data: adminAuth } = useAdminAuthQuery();
  const logoutMutation = useAdminLogoutMutation();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
      </header>

      <AppDrawerNavigation
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAuthenticated={adminAuth?.isAuthenticated ?? false}
        onLogout={handleLogout}
      />

      <main className="relative mx-auto w-full max-w-6xl animate-fadeIn px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
