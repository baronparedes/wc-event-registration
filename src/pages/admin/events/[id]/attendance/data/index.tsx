import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import {
  ROUTE_PATHS,
  toAdminEventAttendance,
  toAdminEventAttendanceDataBulkUpload,
  toAdminEventAttendanceFields,
  toAdminEventDetail,
} from '@/config/constants';
import { QUERY_KEYS } from '@/config/constants';
import { useAttendanceAnswersQuery, useAttendanceSettingsQuery } from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { AttendanceDataEntryList } from './components';

export function AdminAttendanceDataPage() {
  const { id } = useParams<{ id: string }>();

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(id);
  const { data: fields = [], isLoading: fieldsLoading } = useAttendanceFieldsQuery(id, {
    activeOnly: true,
  });
  const queryClient = useQueryClient();
  const {
    data: registrants = [],
    isLoading: registrantsLoading,
    isFetching: registrantsFetching,
    dataUpdatedAt,
  } = useAttendanceAnswersQuery(id);

  const isLoading = eventLoading || settingsLoading || fieldsLoading || registrantsLoading;

  function handleRefreshCache() {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminAttendanceAnswers(id) });
  }
  const attendanceEnabled = settings?.attendance_enabled ?? false;

  const canRunBulkOps = Boolean(id) && attendanceEnabled && fields.length > 0;

  const actions = canRunBulkOps ? (
    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
      {id && (
        <Button asChild variant="outline">
          <Link to={toAdminEventAttendanceDataBulkUpload(id)}>Upload CSV</Link>
        </Button>
      )}
    </div>
  ) : undefined;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: id ? toAdminEventDetail(id) : undefined },
          { label: 'Attendance', to: id ? toAdminEventAttendance(id) : undefined },
          { label: 'Attendee Details' },
        ]}
        navLinks={
          id ? <EventNavigationLinks eventId={id} currentSection="attendance-data" /> : undefined
        }
        title="Manage Attendee Details"
        description={
          event
            ? `Fill in pre-event details for registered attendees of ${event.title}`
            : 'Fill in pre-event details for registered attendees'
        }
        actions={actions}
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

      {!isLoading && attendanceEnabled && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-muted">
          {registrantsFetching ? (
            <span>Loading attendee details...</span>
          ) : (
            <span>
              {registrants.length} attendees cached
              {dataUpdatedAt ? ` · Updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefreshCache}
            disabled={registrantsFetching}
            className="ml-4 rounded px-2 py-1 text-primary underline hover:no-underline disabled:opacity-50"
          >
            {registrantsFetching ? 'Refreshing...' : 'Refresh'}
          </button>
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
