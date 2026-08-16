import { AdminSubNavLink } from '@/components/layout';
import { toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useIsMobileViewport } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';

type EventNavigationSection =
  | 'event'
  | 'fields'
  | 'registrations'
  | 'registrations-detail'
  | 'public-registrations'
  | 'public-registrations-detail'
  | 'attendance'
  | 'attendance-check-in'
  | 'attendance-dashboard'
  | 'attendance-fields'
  | 'attendance-data'
  | 'attendance-unregistered-members';

type EventNavigationLinksProps = {
  eventId: string;
  currentSection: EventNavigationSection;
};

export function EventNavigationLinks({ eventId }: EventNavigationLinksProps) {
  const { data: authState } = useAdminAuthQuery();
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canRead = canAdminPerform(authState?.adminRole, 'canReadAdminData');
  const canAccessCheckIn = canAdminPerform(authState?.adminRole, 'canAccessAttendanceCheckIn');
  const isMobile = useIsMobileViewport();

  if (isMobile) return null;

  return (
    <>
      {canWrite && (
        <AdminSubNavLink to={toRoute('adminEventDetail', { id: eventId })}>Event</AdminSubNavLink>
      )}
      {canWrite && (
        <AdminSubNavLink to={toRoute('adminEventFields', { id: eventId })}>Fields</AdminSubNavLink>
      )}
      {canRead && (
        <AdminSubNavLink to={toRoute('adminRegistrations', { id: eventId })}>
          Registrations
        </AdminSubNavLink>
      )}
      {canWrite && (
        <AdminSubNavLink to={toRoute('adminEventAttendance', { id: eventId })}>
          Attendance
        </AdminSubNavLink>
      )}
      {canRead && (
        <AdminSubNavLink to={toRoute('adminAttendanceData', { id: eventId })}>
          Attendee Details
        </AdminSubNavLink>
      )}
      {canRead && (
        <AdminSubNavLink to={toRoute('adminAttendanceDashboard', { id: eventId })}>
          Dashboard
        </AdminSubNavLink>
      )}
      {canAccessCheckIn && (
        <AdminSubNavLink to={toRoute('adminAttendanceCheckIn', { id: eventId })}>
          Check-In
        </AdminSubNavLink>
      )}
    </>
  );
}
