import { type ComponentType } from 'react';

import {
  BarChart3,
  Calendar,
  ClipboardList,
  FileText,
  FormInput,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  QrCode,
  Settings,
  ShieldCheck,
  Sliders,
  User,
  UserCheck,
  UserCog,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useCurrentProfileQuery } from '@/hooks/domain/members';
import { type AdminRole, canAdminPerform } from '@/lib/domain/auth';

import { Button } from '../ui/Button';
import { UserIdentity } from './UserIdentity';

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
  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text transition hover:bg-primary/10 hover:text-text';
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
      {Icon && <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />}
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
  const location = useLocation();
  const eventId = getEventIdFromPath(location.pathname);
  const { data: selectedEvent } = useAdminEventQuery(eventId ?? undefined);
  const { data: currentProfile } = useCurrentProfileQuery();

  const canWrite = canAdminPerform(adminRole, 'canWriteAdminData');
  const canRead = canAdminPerform(adminRole, 'canReadAdminData');
  const canReadMembers = canAdminPerform(adminRole, 'canReadAdminMemberData');
  const canAccessCheckIn = canAdminPerform(adminRole, 'canAccessAttendanceCheckIn');
  const canManageRoles = canAdminPerform(adminRole, 'canManageAdminRoles');

  const hasProfileAccess = hasSession && Boolean(currentProfile);
  const displayName = currentProfile?.full_name ?? currentUserLabel;
  const avatarObjectKey = currentProfile?.avatar_object_key;
  const roleLabel = adminRole ? `(${adminRole})` : '';

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
              <DrawerNavLink
                to={ROUTE_PATHS.home}
                label="Hub"
                icon={LayoutDashboard}
                onClose={onClose}
              />
              <DrawerNavLink
                to={ROUTE_PATHS.forms}
                label="Forms"
                icon={ClipboardList}
                onClose={onClose}
              />
              {hasProfileAccess && (
                <DrawerNavLink
                  to={ROUTE_PATHS.profile}
                  label="My Profile"
                  icon={User}
                  onClose={onClose}
                />
              )}
              {!hasSession && (
                <DrawerNavLink
                  to={ROUTE_PATHS.login}
                  label="Sign In"
                  icon={LogIn}
                  onClose={onClose}
                />
              )}
            </div>

            {isAuthenticated && (
              <div className="space-y-2">
                <SectionHeading label="Admin" />
                <>
                  {(canRead || canAccessCheckIn) && (
                    <DrawerNavLink
                      to={ROUTE_PATHS.adminEvents}
                      label="Manage Events"
                      icon={Calendar}
                      onClose={onClose}
                    />
                  )}
                  {canRead && (
                    <DrawerNavLink
                      to={ROUTE_PATHS.adminForms}
                      label="Manage Forms"
                      icon={ClipboardList}
                      onClose={onClose}
                    />
                  )}
                  {canReadMembers && (
                    <DrawerNavLink
                      to={ROUTE_PATHS.adminMembers}
                      label="Manage Members"
                      icon={Users}
                      onClose={onClose}
                    />
                  )}
                  {canManageRoles && (
                    <DrawerNavLink
                      to={ROUTE_PATHS.adminUserRoles}
                      label="User Roles"
                      icon={UserCog}
                      onClose={onClose}
                    />
                  )}
                </>
              </div>
            )}

            {eventId && (
              <div className="space-y-2">
                <SectionHeading label="Event Workspace" />
                <p className="px-1 font-heading text-lg font-semibold leading-tight text-text">
                  {selectedEvent?.title ?? eventId}
                </p>
                {canWrite && (
                  <DrawerNavLink
                    to={toRoute('adminEventDetail', { id: eventId })}
                    label="Manage Event"
                    icon={Settings}
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toRoute('adminEventFields', { id: eventId })}
                    label="Manage Registration Fields"
                    icon={FormInput}
                    onClose={onClose}
                  />
                )}
                {canRead && (
                  <DrawerNavLink
                    to={toRoute('adminRegistrations', { id: eventId })}
                    label="Manage Registrations"
                    icon={ClipboardList}
                    onClose={onClose}
                  />
                )}
                {canRead && (
                  <DrawerNavLink
                    to={toRoute('adminPublicRegistrations', { id: eventId })}
                    label="Manage Public Registrations"
                    icon={Globe}
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toRoute('adminEventAttendance', { id: eventId })}
                    label="Manage Attendance"
                    icon={UserCheck}
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
                    to={toRoute('adminAttendanceCheckIn', { id: eventId })}
                    label="Check-In"
                    icon={QrCode}
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toRoute('adminAttendanceFields', { id: eventId })}
                    label="Attendance Fields"
                    icon={Sliders}
                    onClose={onClose}
                  />
                )}
                {canRead && (
                  <DrawerNavLink
                    to={toRoute('adminAttendanceData', { id: eventId })}
                    label="Attendee Details"
                    icon={Users}
                    onClose={onClose}
                  />
                )}
                {canRead && (
                  <DrawerNavLink
                    to={toRoute('adminAttendanceDashboard', { id: eventId })}
                    label="Attendance Dashboard"
                    icon={BarChart3}
                    onClose={onClose}
                  />
                )}
                {canWrite && (
                  <DrawerNavLink
                    to={toRoute('adminAttendanceUnregisteredMembers', { id: eventId })}
                    label="Unregistered Members"
                    icon={UserX}
                    onClose={onClose}
                  />
                )}
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
