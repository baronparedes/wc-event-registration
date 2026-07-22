import { AdminSubNavLink } from '@/components/layout';
import {
  toAdminEventAttendance,
  toAdminEventAttendanceCheckIn,
  toAdminEventAttendanceData,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
} from '@/config/constants';

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
  return (
    <>
      <AdminSubNavLink to={toAdminEventDetail(eventId)}>Event</AdminSubNavLink>
      <AdminSubNavLink to={toAdminEventFields(eventId)}>Fields</AdminSubNavLink>
      <AdminSubNavLink to={toAdminEventRegistrations(eventId)}>Registrations</AdminSubNavLink>
      <AdminSubNavLink to={toAdminEventAttendance(eventId)}>Attendance</AdminSubNavLink>
      <AdminSubNavLink to={toAdminEventAttendanceData(eventId)}>Attendee Details</AdminSubNavLink>
      <AdminSubNavLink to={toAdminEventAttendanceCheckIn(eventId)}>Check-In</AdminSubNavLink>
    </>
  );
}
