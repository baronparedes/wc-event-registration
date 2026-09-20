import { type ComponentType, useMemo } from 'react';

import {
  BarChart3,
  Bot,
  Calendar,
  CalendarDays,
  ClipboardList,
  FormInput,
  Globe,
  Layers,
  LayoutDashboard,
  LogIn,
  QrCode,
  Settings,
  Sliders,
  User,
  UserCheck,
  UserCog,
  UserX,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useAdminFormQuery } from '@/hooks/domain/forms';
import { useAdminMemberQuery, useCurrentProfileQuery } from '@/hooks/domain/members';
import { type AdminRole, canAdminPerform } from '@/lib/domain/auth';

export type DrawerNavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export type UseAppDrawerNavigationProps = {
  isAuthenticated: boolean;
  hasSession?: boolean;
  adminRole?: AdminRole | null;
  currentUserLabel?: string | null;
};

export function getEventIdFromPath(pathname: string): string | null {
  if (
    pathname === ROUTE_PATHS.adminEventNew ||
    pathname.startsWith(`${ROUTE_PATHS.adminEventNew}/`)
  ) {
    return null;
  }

  const eventRouteMatch = pathname.match(/^\/admin\/events\/([^/]+)/);
  return eventRouteMatch?.[1] ?? null;
}

export function getFormIdFromPath(pathname: string): string | null {
  if (
    pathname === ROUTE_PATHS.adminFormNew ||
    pathname.startsWith(`${ROUTE_PATHS.adminFormNew}/`)
  ) {
    return null;
  }

  const formRouteMatch = pathname.match(/^\/admin\/forms\/([^/]+)/);
  return formRouteMatch?.[1] ?? null;
}

export function getMemberIdFromPath(pathname: string): string | null {
  if (
    pathname === ROUTE_PATHS.adminMembersImport ||
    pathname.startsWith(`${ROUTE_PATHS.adminMembersImport}/`)
  ) {
    return null;
  }

  const memberRouteMatch = pathname.match(/^\/admin\/members\/([^/]+)/);
  return memberRouteMatch?.[1] ?? null;
}

export function useAppDrawerNavigation({
  isAuthenticated,
  hasSession = isAuthenticated,
  adminRole = null,
  currentUserLabel = null,
}: UseAppDrawerNavigationProps) {
  const location = useLocation();
  const eventId = getEventIdFromPath(location.pathname);
  const formId = getFormIdFromPath(location.pathname);
  const memberId = getMemberIdFromPath(location.pathname);

  const { data: selectedEvent } = useAdminEventQuery(eventId ?? undefined);
  const { data: selectedForm } = useAdminFormQuery(formId ?? undefined);
  const { data: selectedMember } = useAdminMemberQuery(memberId ?? undefined);
  const { data: currentProfile } = useCurrentProfileQuery();

  const canWrite = canAdminPerform(adminRole, 'canWriteAdminData');
  const canRead = canAdminPerform(adminRole, 'canReadAdminData');
  const canReadMembers = canAdminPerform(adminRole, 'canReadAdminMemberData');
  const canAccessCheckIn = canAdminPerform(adminRole, 'canAccessAttendanceCheckIn');
  const canManageRoles = canAdminPerform(adminRole, 'canManageAdminRoles');
  const canReadDashboard = canAdminPerform(adminRole, 'canReadDashboard');
  const canManageServices = canAdminPerform(adminRole, 'canManageServices');

  const hasProfileAccess = hasSession && Boolean(currentProfile);
  const displayName = currentProfile?.full_name ?? currentUserLabel;
  const avatarObjectKey = currentProfile?.avatar_object_key;
  const roleLabel = adminRole ? `(${adminRole})` : '';

  const mainNavItems = useMemo<DrawerNavItem[]>(() => {
    const items: DrawerNavItem[] = [
      {
        to: ROUTE_PATHS.home,
        label: 'Hub',
        icon: LayoutDashboard,
      },
    ];

    if (hasProfileAccess) {
      items.push({
        to: ROUTE_PATHS.profile,
        label: 'My Profile',
        icon: User,
      });
    }

    if (!hasSession) {
      items.push({
        to: ROUTE_PATHS.login,
        label: 'Sign In',
        icon: LogIn,
      });
    }

    return items;
  }, [hasProfileAccess, hasSession]);

  const adminNavItems = useMemo<DrawerNavItem[]>(() => {
    if (!isAuthenticated) return [];

    const items: DrawerNavItem[] = [];

    if (canReadDashboard) {
      items.push({
        to: ROUTE_PATHS.adminHubCalendar,
        label: 'Hub Calendar',
        icon: CalendarDays,
      });
    }

    if (canRead || canAccessCheckIn) {
      items.push({
        to: ROUTE_PATHS.adminEvents,
        label: 'Manage Events',
        icon: Calendar,
      });
    }

    if (canRead) {
      items.push({
        to: ROUTE_PATHS.adminForms,
        label: 'Manage Forms',
        icon: ClipboardList,
      });
    }

    if (canReadMembers) {
      items.push({
        to: ROUTE_PATHS.adminMembers,
        label: 'Manage Members',
        icon: Users,
      });
    }

    if (canManageRoles) {
      items.push({
        to: ROUTE_PATHS.adminUserRoles,
        label: 'Manage Roles',
        icon: UserCog,
      });
    }

    if (canManageServices) {
      items.push({
        to: ROUTE_PATHS.adminServices,
        label: 'Manage Services',
        icon: Layers,
      });
    }

    if (canRead) {
      items.push({
        to: ROUTE_PATHS.adminChat,
        label: 'AI Assistant',
        icon: Bot,
      });
    }

    return items;
  }, [
    isAuthenticated,
    canReadDashboard,
    canRead,
    canAccessCheckIn,
    canReadMembers,
    canManageRoles,
    canManageServices,
  ]);

  const eventWorkspaceNavItems = useMemo<DrawerNavItem[]>(() => {
    if (!eventId) return [];

    const items: DrawerNavItem[] = [];

    if (canWrite) {
      items.push({
        to: toRoute('adminEventDetail', { id: eventId }),
        label: 'Manage Event',
        icon: Settings,
      });
      items.push({
        to: toRoute('adminEventFields', { id: eventId }),
        label: 'Manage Registration Fields',
        icon: FormInput,
      });
    }

    if (canRead) {
      items.push({
        to: toRoute('adminRegistrations', { id: eventId }),
        label: 'Manage Registrations',
        icon: ClipboardList,
      });
      items.push({
        to: toRoute('adminPublicRegistrations', { id: eventId }),
        label: 'Manage Public Registrations',
        icon: Globe,
      });
    }

    if (canWrite) {
      items.push({
        to: toRoute('adminEventAttendance', { id: eventId }),
        label: 'Manage Attendance',
        icon: UserCheck,
      });
    }

    return items;
  }, [eventId, canWrite, canRead]);

  const attendanceNavItems = useMemo<DrawerNavItem[]>(() => {
    if (!eventId) return [];

    const items: DrawerNavItem[] = [];

    if (canAccessCheckIn) {
      items.push({
        to: toRoute('adminAttendanceCheckIn', { id: eventId }),
        label: 'Check-In',
        icon: QrCode,
      });
    }

    if (canWrite) {
      items.push({
        to: toRoute('adminAttendanceFields', { id: eventId }),
        label: 'Attendance Fields',
        icon: Sliders,
      });
    }

    if (canRead) {
      items.push({
        to: toRoute('adminAttendanceData', { id: eventId }),
        label: 'Attendee Details',
        icon: Users,
      });
      items.push({
        to: toRoute('adminAttendanceDashboard', { id: eventId }),
        label: 'Attendance Dashboard',
        icon: BarChart3,
      });
    }

    if (canWrite) {
      items.push({
        to: toRoute('adminAttendanceUnregisteredMembers', { id: eventId }),
        label: 'Unregistered Members',
        icon: UserX,
      });
    }

    return items;
  }, [eventId, canAccessCheckIn, canWrite, canRead]);

  const formWorkspaceNavItems = useMemo<DrawerNavItem[]>(() => {
    if (!formId) return [];

    const items: DrawerNavItem[] = [];

    if (canWrite) {
      items.push({
        to: toRoute('adminFormDetail', { id: formId }),
        label: 'Manage Form',
        icon: Settings,
      });
      items.push({
        to: toRoute('adminFormFields', { id: formId }),
        label: 'Manage Form Fields',
        icon: FormInput,
      });
    }

    if (canRead) {
      items.push({
        to: toRoute('adminFormSubmissions', { id: formId }),
        label: 'Manage Submissions',
        icon: ClipboardList,
      });
    }

    return items;
  }, [formId, canWrite, canRead]);

  const memberWorkspaceNavItems = useMemo<DrawerNavItem[]>(() => {
    if (!memberId) return [];

    const items: DrawerNavItem[] = [];

    if (canReadMembers) {
      items.push({
        to: toRoute('adminMemberDetail', { id: memberId }),
        label: 'Edit Member',
        icon: Settings,
      });
      items.push({
        to: toRoute('adminMemberServiceAttendance', { id: memberId }),
        label: 'Service Attendance',
        icon: UserCheck,
      });
      items.push({
        to: toRoute('adminMemberEventHistory', { id: memberId }),
        label: 'Event History',
        icon: Calendar,
      });
    }

    return items;
  }, [memberId, canReadMembers]);

  return {
    mainNavItems,
    adminNavItems,
    eventWorkspaceNavItems,
    attendanceNavItems,
    formWorkspaceNavItems,
    memberWorkspaceNavItems,
    eventId,
    selectedEvent,
    formId,
    selectedForm,
    memberId,
    selectedMember,
    hasProfileAccess,
    displayName,
    avatarObjectKey,
    roleLabel,
  };
}
