import { type ComponentType } from 'react';

import { FileText, LogOut, ShieldCheck, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { ROUTE_PATHS } from '@/config/constants';
import type { AdminRole } from '@/lib/domain/auth';

import { Button } from '../ui/Button';
import { UserIdentity } from './UserIdentity';
import { useAppDrawerNavigation } from './hooks/useAppDrawerNavigation';

type AppDrawerNavigationProps = {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  hasSession?: boolean;
  adminRole?: AdminRole | null;
  currentUserLabel?: string | null;
  onLogout: () => Promise<void>;
};

const linkClassName =
  'flex min-h-[48px] items-center gap-3.5 rounded-xl border-2 border-transparent px-4 py-3 text-base font-semibold text-text transition hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:bg-primary/15';
const activeLinkClassName = 'border-primary bg-primary/20 font-bold text-text shadow-sm';

function SectionHeading({ label }: { label: string }) {
  return <p className="px-2 pb-1 text-xs font-bold uppercase tracking-wider text-muted">{label}</p>;
}

function DrawerNavLink({
  to,
  label,
  icon: Icon,
  onClose,
}: {
  to: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClose: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) => `${linkClassName} ${isActive ? activeLinkClassName : ''}`.trim()}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />}
      <span>{label}</span>
    </NavLink>
  );
}

export function AppDrawerNavigation({
  isOpen,
  onClose,
  isAuthenticated,
  hasSession = isAuthenticated,
  adminRole = null,
  currentUserLabel = null,
  onLogout,
}: AppDrawerNavigationProps) {
  const {
    mainNavItems,
    adminNavItems,
    eventWorkspaceNavItems,
    attendanceNavItems,
    eventId,
    selectedEvent,
    hasProfileAccess,
    displayName,
    avatarObjectKey,
    roleLabel,
  } = useAppDrawerNavigation({
    isAuthenticated,
    hasSession,
    adminRole,
    currentUserLabel,
  });

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation drawer overlay"
          className="fixed inset-0 z-40 bg-text/25 backdrop-blur-[1px]"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-sm border-l border-border bg-surface shadow-xl transition-transform duration-200 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="App navigation drawer"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-heading text-xl font-semibold text-text">Navigation</h2>
            <button
              type="button"
              aria-label="Close navigation drawer"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted transition hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={onClose}
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              {mainNavItems.map((item) => (
                <DrawerNavLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  icon={item.icon}
                  onClose={onClose}
                />
              ))}
            </div>

            {isAuthenticated && adminNavItems.length > 0 && (
              <div className="space-y-2">
                <SectionHeading label="Admin" />
                {adminNavItems.map((item) => (
                  <DrawerNavLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}

            {eventId && eventWorkspaceNavItems.length > 0 && (
              <div className="space-y-2">
                <SectionHeading label="Event Workspace" />
                <p className="px-1 font-heading text-lg font-semibold leading-tight text-text">
                  {selectedEvent?.title ?? eventId}
                </p>
                {eventWorkspaceNavItems.map((item) => (
                  <DrawerNavLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}

            {eventId && attendanceNavItems.length > 0 && (
              <div className="space-y-2">
                <SectionHeading label="Attendance" />
                {attendanceNavItems.map((item) => (
                  <DrawerNavLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    onClose={onClose}
                  />
                ))}
              </div>
            )}
          </div>

          {hasSession && (
            <div className="p-4">
              <div className="mb-3 flex items-center justify-center gap-3 border-b border-border pb-3 text-[11px] text-muted">
                <NavLink
                  to={ROUTE_PATHS.privacy}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 transition hover:text-text hover:underline hover:underline-offset-2"
                >
                  <ShieldCheck className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  <span>Privacy Policy</span>
                </NavLink>
                <span aria-hidden="true" className="text-border">
                  •
                </span>
                <NavLink
                  to={ROUTE_PATHS.terms}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 transition hover:text-text hover:underline hover:underline-offset-2"
                >
                  <FileText className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                  <span>Terms of Service</span>
                </NavLink>
              </div>

              {displayName && (
                <div className="mb-3">
                  <UserIdentity
                    displayName={displayName}
                    avatarObjectKey={avatarObjectKey}
                    roleLabel={roleLabel}
                    hasProfileAccess={hasProfileAccess}
                    variant="drawer"
                    onProfileClick={onClose}
                  />
                </div>
              )}
              <Button
                type="button"
                variant="primaryOutline"
                size="sm"
                className="w-full gap-2"
                onClick={async () => {
                  await onLogout();
                  onClose();
                }}
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Sign Out</span>
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
