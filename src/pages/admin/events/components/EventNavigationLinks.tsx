import { AdminSubNavLink } from '@/components/layout';
import {
  toAdminEventAttendance,
  toAdminEventAttendanceCheckIn,
  toAdminEventAttendanceData,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
} from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { canAccessAttendanceCheckIn, canReadAdminData, canWriteAdminData } from '@/lib/domain/auth';

type EventNavigationSection =
  | 'event'
  | 'fields'
  | 'registrations'
  | 'registrations-detail'
  | 'public-registrations'
  | 'public-registrations-detail'
  | 'attendance'
  | 'attendance-check-in'
  | 'attendance-fields'
  | 'attendance-data'
  | 'attendance-unregistered-members';

type EventNavigationLinksProps = {
  eventId: string;
  currentSection: EventNavigationSection;
};

export function EventNavigationLinks({ eventId }: EventNavigationLinksProps) {
  const { data: authState } = useAdminAuthQuery();
  const canWrite = canWriteAdminData(authState?.adminRole);
  const canRead = canReadAdminData(authState?.adminRole);
  const canAccessCheckIn = canAccessAttendanceCheckIn(authState?.adminRole);

  return (
    <>
      {canWrite && <AdminSubNavLink to={toAdminEventDetail(eventId)}>Event</AdminSubNavLink>}
      {canWrite && <AdminSubNavLink to={toAdminEventFields(eventId)}>Fields</AdminSubNavLink>}
      {canRead && (
        <AdminSubNavLink to={toAdminEventRegistrations(eventId)}>Registrations</AdminSubNavLink>
      )}
      {canWrite && (
        <AdminSubNavLink to={toAdminEventAttendance(eventId)}>Attendance</AdminSubNavLink>
      )}
      {canRead && (
        <AdminSubNavLink to={toAdminEventAttendanceData(eventId)}>Attendee Details</AdminSubNavLink>
      )}
      {canAccessCheckIn && (
        <AdminSubNavLink to={toAdminEventAttendanceCheckIn(eventId)}>Check-In</AdminSubNavLink>
      )}
    </>
  );
}
