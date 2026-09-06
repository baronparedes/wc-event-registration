import { useState } from 'react';

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { ROUTE_PATHS, TOAST_MESSAGES, isMinimizedAppShellRoute } from '@/config/constants';
import { useAdminAuthQuery, useAdminLogoutMutation } from '@/hooks/domain/auth';
import { useCurrentProfileQuery } from '@/hooks/domain/members';

import { AppDrawerNavigation } from './AppDrawerNavigation';
import { AppFooter } from './AppFooter';
import { AppShellHeader } from './AppShellHeader';
import { UserIdentity } from './UserIdentity';

function getCurrentUserLabel(email?: string | null, phone?: string | null, userId?: string) {
  return email ?? phone ?? userId ?? null;
}

export function AppMobileShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: adminAuth } = useAdminAuthQuery();
  const { data: currentProfile } = useCurrentProfileQuery();
  const logoutMutation = useAdminLogoutMutation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMinimizedShell = isMinimizedAppShellRoute(location.pathname);
  const currentUserLabel = getCurrentUserLabel(
    adminAuth?.session?.user?.email,
    adminAuth?.session?.user?.phone,
    adminAuth?.session?.user?.id,
  );
  const hasSession = Boolean(adminAuth?.session);

  const displayName = currentProfile?.full_name ?? currentUserLabel;
  const avatarObjectKey = currentProfile?.avatar_object_key;
  const roleLabel = adminAuth?.adminRole ? `(${adminAuth.adminRole})` : '';

  async function handleLogout() {
    try {
      await logoutMutation.mutateAsync();
      toast.success(TOAST_MESSAGES.adminSignOutSuccess);
      navigate(ROUTE_PATHS.home);
    } catch (error) {
      const message = error instanceof Error ? error.message : TOAST_MESSAGES.adminSignOutFailure;
      toast.error(message);
    }
  }

  const userBadge = hasSession && displayName && (
    <div className="flex items-center gap-2">
      <UserIdentity
        displayName={displayName}
        avatarObjectKey={avatarObjectKey}
        roleLabel={roleLabel}
        hasProfileAccess={Boolean(currentProfile)}
        contentClassName="max-w-[10rem] sm:max-w-[15rem]"
        showNameLabel={false}
        disableLink={isMinimizedShell}
      />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <AppShellHeader
        isMinimizedShell={isMinimizedShell}
        userBadge={userBadge}
        onOpenDrawer={() => setDrawerOpen(true)}
      />

      <AppDrawerNavigation
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isAuthenticated={adminAuth?.isAuthenticated ?? false}
        hasSession={hasSession}
        adminRole={adminAuth?.adminRole ?? null}
        currentUserLabel={currentUserLabel}
        onLogout={handleLogout}
      />

      <main
        className={`relative mx-auto w-full max-w-6xl flex-1 animate-fadeIn ${
          isMinimizedShell ? 'px-2 py-2 sm:px-3' : 'px-4 py-8'
        }`}
      >
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
