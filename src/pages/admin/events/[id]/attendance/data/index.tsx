import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import {
  ROUTE_PATHS,
  toAdminEventAttendance,
  toAdminEventAttendanceFields,
} from '@/config/constants';
import { useAttendanceAnswersQuery, useAttendanceSettingsQuery } from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';

import { AttendanceDataEntryList } from './components';

export function AdminAttendanceDataPage() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(id);
  const { data: fields = [], isLoading: fieldsLoading } = useAttendanceFieldsQuery(id, {
    activeOnly: true,
  });
  const { data: registrants = [], isLoading: registrantsLoading } = useAttendanceAnswersQuery(id);

  const isLoading = eventLoading || settingsLoading || fieldsLoading || registrantsLoading;
  const attendanceEnabled = settings?.attendance_enabled ?? false;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: id ? toAdminEventAttendance(id) : undefined },
          { label: 'Attendee Details' },
        ]}
        navLinks={
          id ? (
            <ActionLink to={toAdminEventAttendance(id)}>Back to Attendance</ActionLink>
          ) : undefined
        }
        title="Attendee Details"
        description={
          event
            ? `Fill in pre-event details for registered attendees of ${event.title}`
            : 'Fill in pre-event details for registered attendees'
        }
      />

      {!isLoading && !attendanceEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Attendance tracking is disabled</p>
          <p className="mt-1 text-xs text-amber-700">
            Enable attendance tracking in{' '}
            {id ? (
              <ActionLink to={toAdminEventAttendance(id)}>Attendance Settings</ActionLink>
            ) : (
              'Attendance Settings'
            )}{' '}
            to collect attendance data.
          </p>
        </div>
      )}

      {!isLoading && attendanceEnabled && fields.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">No attendance fields configured</p>
          <p className="mt-1 text-xs text-blue-700">
            {id ? (
              <>
                <ActionLink to={toAdminEventAttendanceFields(id)}>
                  Configure attendance fields
                </ActionLink>{' '}
                first to start collecting data.
              </>
            ) : (
              'Configure attendance fields first to start collecting data.'
            )}
          </p>
        </div>
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading attendance data...">
        {!event ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Event not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminEvents}>
              Back to events
            </Link>
          </div>
        ) : (
          <AttendanceDataEntryList eventId={id ?? ''} registrants={registrants} fields={fields} />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
