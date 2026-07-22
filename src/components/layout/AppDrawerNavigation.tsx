import { X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  ROUTE_PATHS,
  toAdminEventAttendance,
  toAdminEventAttendanceCheckIn,
  toAdminEventAttendanceData,
  toAdminEventAttendanceFields,
  toAdminEventAttendanceUnregisteredMembers,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventPublicRegistrations,
  toAdminEventRegistrations,
} from '@/config/constants';
import { useAdminEventQuery } from '@/hooks/domain/events';
import {
  type AdminRole,
  canAccessAttendanceCheckIn,
  canReadAdminData,
  canWriteAdminData,
} from '@/lib/domain/auth';

import { Button } from '../ui/Button';

type AppDrawerNavigationProps = {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  adminRole?: AdminRole | null;
  currentUserLabel?: string | null;
  onLogout: () => Promise<void>;
};

const linkClassName =
  'block rounded-md px-3 py-2 text-sm text-text transition hover:bg-primary/10 hover:text-text';
const activeLinkClassName = 'bg-primary/10 font-semibold text-text';

function getEventIdFromPath(pathname: string): string | null {
  if (
    pathname === ROUTE_PATHS.adminEventNew ||
    pathname.startsWith(`${ROUTE_PATHS.adminEventNew}/`)
  ) {
    return null;
  }

  const eventRouteMatch = pathname.match(/^\/admin\/events\/([^/]+)/);
  return eventRouteMatch?.[1] ?? null;
}

function SectionHeading({ label }: { label: string }) {
  return <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>;
}

function DrawerNavLink({ to, label, onClose }: { to: string; label: string; onClose: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) => `${linkClassName} ${isActive ? activeLinkClassName : ''}`.trim()}
    >
      {label}
    </NavLink>
  );
}

function getSignedInText(userLabel: string, role?: AdminRole | null) {
  return role ? `Signed in as ${userLabel} (${role})` : `Signed in as ${userLabel}`;
}

export function AppDrawerNavigation({
  isOpen,
  onClose,
  isAuthenticated,
  adminRole = null,
  currentUserLabel = null,
  onLogout,
}: AppDrawerNavigationProps) {
  const location = useLocation();
  const eventId = getEventIdFromPath(location.pathname);
  const { data: selectedEvent } = useAdminEventQuery(eventId ?? undefined);
  const canWrite = canWriteAdminData(adminRole);
  const canRead = canReadAdminData(adminRole);
  const canAccessCheckIn = canAccessAttendanceCheckIn(adminRole);

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
              className="rounded-md p-2 text-muted transition hover:bg-primary/10 hover:text-text"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            <div className="space-y-2">
              <SectionHeading label="General" />
              <DrawerNavLink to={ROUTE_PATHS.home} label="Events" onClose={onClose} />
            </div>

            <div className="space-y-2">
              <SectionHeading label="Admin" />
              {isAuthenticated ? (
                <>
                  {canRead && (
                    <DrawerNavLink
                      to={ROUTE_PATHS.adminEvents}
                      label="Manage Events"
                      onClose={onClose}
                    />
                  )}
                  {canRead && (
                    <DrawerNavLink
                      to={ROUTE_PATHS.adminMembers}
                      label="Manage Members"
                      onClose={onClose}
                    />
                  )}
                </>
              ) : (
                <DrawerNavLink to={ROUTE_PATHS.adminLogin} label="Sign In" onClose={onClose} />
              )}
            </div>

            {eventId && (
              <div className="space-y-2">
                <SectionHeading label="Event Workspace" />
                <p className="px-1 font-heading text-lg font-semibold leading-tight text-text">
                  {selectedEvent?.title ?? eventId}
                </p>
                {canWrite && (
                  <DrawerNavLink
                    to={toAdminEventDetail(eventId)}
                    label="Manage Event"
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toAdminEventFields(eventId)}
                    label="Manage Registration Fields"
                    onClose={onClose}
                  />
                )}
                {canRead && (
                  <DrawerNavLink
                    to={toAdminEventRegistrations(eventId)}
                    label="Manage Registrations"
                    onClose={onClose}
                  />
                )}
                {canRead && (
                  <DrawerNavLink
                    to={toAdminEventPublicRegistrations(eventId)}
                    label="Manage Public Registrations"
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toAdminEventAttendance(eventId)}
                    label="Manage Attendance"
                    onClose={onClose}
                  />
                )}
              </div>
            )}

            {eventId && (
              <div className="space-y-2">
                <SectionHeading label="Attendance" />
                {canAccessCheckIn && (
                  <DrawerNavLink
                    to={toAdminEventAttendanceCheckIn(eventId)}
                    label="Check-In"
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toAdminEventAttendanceFields(eventId)}
                    label="Attendance Fields"
                    onClose={onClose}
                  />
                )}
                {canRead && (
                  <DrawerNavLink
                    to={toAdminEventAttendanceData(eventId)}
                    label="Attendee Details"
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toAdminEventAttendanceUnregisteredMembers(eventId)}
                    label="Unregistered Members"
                    onClose={onClose}
                  />
                )}
              </div>
            )}
          </div>

          {isAuthenticated && (
            <div className="border-t border-border p-4">
              {currentUserLabel && (
                <p className="mb-3 truncate text-xs text-muted">
                  {getSignedInText(currentUserLabel, adminRole)}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  await onLogout();
                  onClose();
                }}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
