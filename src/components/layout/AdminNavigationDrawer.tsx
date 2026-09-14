import { type ComponentType, useEffect, useId } from 'react';

import { Bot, Calendar, CalendarDays, ClipboardList, Menu, UserCog, Users, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { ROUTE_PATHS } from '@/config/constants';
import { type AdminRole, canAdminPerform } from '@/lib/domain/auth';

export type AdminNavigationDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  adminRole?: AdminRole | null;
  /** If specified, bypasses role checks and displays all 4 admin links. Default is false. */
  showAllAdminLinks?: boolean;
};

export type AdminDrawerToggleProps = {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
  label?: string;
  drawerId?: string;
};

/** Senior-friendly link styles enforcing >= 48px touch targets and generous padding. */
const adminNavLinkClassName =
  'flex min-h-[48px] items-center gap-3.5 rounded-xl border border-transparent px-4 py-3 text-base font-semibold text-text transition hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:bg-primary/15';

const activeAdminNavLinkClassName = 'bg-primary/20 font-bold text-text shadow-sm';

type AdminNavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isAllowed: boolean;
};

/**
 * Forgiving, senior-friendly toggle button for the Admin Navigation Drawer.
 * Enforces a minimum 48px touch target with clear iconography and visible states.
 */
export function AdminDrawerToggle({
  isOpen,
  onToggle,
  className = '',
  label = 'Admin Menu',
  drawerId = 'admin-navigation-drawer',
}: AdminDrawerToggleProps) {
  return (
    <button
      type="button"
      id={`${drawerId}-toggle`}
      aria-label="Open admin navigation drawer"
      aria-expanded={isOpen}
      aria-controls={drawerId}
      onClick={onToggle}
      className={`inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-2.5 text-base font-semibold text-text shadow-xs transition hover:bg-primary/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${className}`.trim()}
    >
      <Menu className="h-6 w-6 shrink-0" aria-hidden="true" />
      {label && <span>{label}</span>}
    </button>
  );
}

/**
 * Collapsible side navigation drawer housing admin links (Manage Events, Manage Forms,
 * Manage Members, User Roles). Designed specifically with large, forgiving touch targets
 * (minimum 48px) and readable typography optimized for senior users.
 */
export function AdminNavigationDrawer({
  isOpen,
  onClose,
  adminRole = null,
  showAllAdminLinks = false,
}: AdminNavigationDrawerProps) {
  const drawerId = useId();

  // Close drawer on Escape key press for keyboard accessibility
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Determine permissions for admin items
  const canReadEvents =
    showAllAdminLinks ||
    canAdminPerform(adminRole, 'canReadAdminData') ||
    canAdminPerform(adminRole, 'canAccessAttendanceCheckIn');
  const canReadForms = showAllAdminLinks || canAdminPerform(adminRole, 'canReadAdminData');
  const canReadMembers = showAllAdminLinks || canAdminPerform(adminRole, 'canReadAdminMemberData');
  const canManageRoles = showAllAdminLinks || canAdminPerform(adminRole, 'canManageAdminRoles');
  const canReadDashboard =
    showAllAdminLinks || (adminRole && ['super_admin', 'admin', 'slod'].includes(adminRole));

  const adminNavItems: AdminNavItem[] = [
    {
      to: ROUTE_PATHS.adminHubCalendar,
      label: 'Hub Calendar',
      icon: CalendarDays,
      isAllowed: canReadDashboard ?? false,
    },
    {
      to: ROUTE_PATHS.adminEvents,
      label: 'Manage Events',
      icon: Calendar,
      isAllowed: canReadEvents,
    },
    {
      to: ROUTE_PATHS.adminChat,
      label: 'AI Assistant',
      icon: Bot,
      isAllowed: canReadEvents,
    },
    {
      to: ROUTE_PATHS.adminForms,
      label: 'Manage Forms',
      icon: ClipboardList,
      isAllowed: canReadForms,
    },
    {
      to: ROUTE_PATHS.adminMembers,
      label: 'Manage Members',
      icon: Users,
      isAllowed: canReadMembers,
    },
    {
      to: ROUTE_PATHS.adminUserRoles,
      label: 'User Roles',
      icon: UserCog,
      isAllowed: canManageRoles,
    },
  ];

  const visibleItems = adminNavItems.filter((item) => item.isAllowed);

  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close admin navigation drawer overlay"
          className="fixed inset-0 z-40 bg-text/30 backdrop-blur-[1px] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Slide-over Drawer Panel */}
      <aside
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation drawer"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex min-h-[64px] items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-heading text-xl font-bold text-text">Admin Navigation</h2>
          <button
            type="button"
            aria-label="Close admin navigation drawer"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted transition hover:bg-primary/10 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onClose}
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <nav aria-label="Admin links" className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          <p className="px-2 pb-2 text-xs font-bold uppercase tracking-wider text-muted">
            Administration
          </p>

          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `${adminNavLinkClassName} ${isActive ? activeAdminNavLinkClassName : ''}`.trim()
                }
              >
                <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
