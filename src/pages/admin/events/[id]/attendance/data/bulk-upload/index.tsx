import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { ActionLink, AlertBanner, Button } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import {
  useAttendanceSettingsQuery,
  useDownloadAttendanceCSVMutation,
} from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { BulkUploadPanel } from '@/pages/admin/events/[id]/attendance/data/bulk-upload/components/BulkUploadPanel';
import { EventNavigationLinks } from '@/pages/admin/events/components';

function downloadCsv(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/csv; charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AdminAttendanceDataBulkUploadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(id);
  const { data: fields = [], isLoading: fieldsLoading } = useAttendanceFieldsQuery(id, {
    activeOnly: true,
  });
  const downloadMutation = useDownloadAttendanceCSVMutation(id ?? '');

  const isLoading = eventLoading || settingsLoading || fieldsLoading;
  const attendanceEnabled = settings?.attendance_enabled ?? false;
  const canRunBulkOps = Boolean(id) && attendanceEnabled && fields.length > 0;

  const actions = canRunBulkOps ? (
    <Button
      variant="primaryOutline"
      disabled={downloadMutation.isPending}
      onClick={async () => {
        if (!id) return;

        const fallbackFilename = `event-${id}-attendance-data.csv`;
        try {
          const { text, filename } = await downloadMutation.mutateAsync();
          downloadCsv(text, filename || fallbackFilename);
        } catch (error) {
          let message = 'Failed to download attendance CSV.';
          if (error instanceof Error) {
            message = error.message;
          }
          toast.error(message);
        }
      }}
    >
      {downloadMutation.isPending ? 'Downloading...' : 'Download CSV Template'}
    </Button>
  ) : undefined;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          {
            label: event?.title ?? 'Event',
            to: id ? toRoute('adminEventDetail', { id }) : undefined,
          },
          { label: 'Attendance', to: id ? toRoute('adminEventAttendance', { id }) : undefined },
          {
            label: 'Attendee Details',
            to: id ? toRoute('adminAttendanceData', { id }) : undefined,
          },
          { label: 'Bulk CSV Upload' },
        ]}
        navLinks={
          id ? <EventNavigationLinks eventId={id} currentSection="attendance-data" /> : undefined
        }
        title="Bulk CSV Upload"
        description={
          event
            ? `Upload attendance details in bulk for ${event.title}`
            : 'Upload attendance details in bulk'
        }
        actions={actions}
      />

      {!isLoading && !attendanceEnabled && (
        <AlertBanner
          variant="warning"
          title="Attendance tracking is disabled"
          description={
            <>
              Enable attendance tracking in{' '}
              {id ? (
                <ActionLink to={toRoute('adminEventAttendance', { id })}>
                  Attendance Settings
                </ActionLink>
              ) : (
                'Attendance Settings'
              )}{' '}
              to collect attendance data.
            </>
          }
        />
      )}

      {!isLoading && attendanceEnabled && fields.length === 0 && (
        <AlertBanner
          variant="info"
          title="No attendance fields configured"
          description={
            id ? (
              <>
                <ActionLink to={toRoute('adminAttendanceFields', { id })}>
                  Configure attendance fields
                </ActionLink>{' '}
                first to start collecting data.
              </>
            ) : (
              'Configure attendance fields first to start collecting data.'
            )
          }
        />
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading bulk upload...">
        {!event ? (
          <AlertBanner
            variant="error"
            description={
              <>
                Event not found.{' '}
                <Link className="underline" to={ROUTE_PATHS.adminEvents}>
                  Back to events
                </Link>
              </>
            }
          />
        ) : canRunBulkOps ? (
          <BulkUploadPanel
            eventId={id ?? ''}
            fields={fields}
            onClose={() =>
              navigate(id ? toRoute('adminAttendanceData', { id }) : ROUTE_PATHS.adminEvents)
            }
            displayMode="page"
          />
        ) : null}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
