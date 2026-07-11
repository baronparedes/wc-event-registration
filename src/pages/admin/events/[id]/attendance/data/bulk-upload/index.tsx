import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import {
  ROUTE_PATHS,
  toAdminEventAttendance,
  toAdminEventAttendanceData,
  toAdminEventAttendanceFields,
  toAdminEventDetail,
} from '@/config/constants';
import {
  useAttendanceSettingsQuery,
  useDownloadAttendanceCSVMutation,
} from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { BulkUploadPanel } from '@/pages/admin/events/[id]/attendance/data/bulk-upload/components/BulkUploadPanel';
import { EventNavigationLinks } from '@/pages/admin/events/components';

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
      size="sm"
      disabled={downloadMutation.isPending}
      onClick={async () => {
        if (!id) return;

        try {
          const { text, filename } = await downloadMutation.mutateAsync();
          const blob = new Blob([text], { type: 'text/csv; charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename ?? `event-${id}-attendance-data.csv`;
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to download attendance CSV.';
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
          { label: event?.title ?? 'Event', to: id ? toAdminEventDetail(id) : undefined },
          { label: 'Attendance', to: id ? toAdminEventAttendance(id) : undefined },
          { label: 'Attendee Details', to: id ? toAdminEventAttendanceData(id) : undefined },
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

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading bulk upload...">
        {!event ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Event not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminEvents}>
              Back to events
            </Link>
          </div>
        ) : canRunBulkOps ? (
          <BulkUploadPanel
            eventId={id ?? ''}
            fields={fields}
            onClose={() => navigate(id ? toAdminEventAttendanceData(id) : ROUTE_PATHS.adminEvents)}
            displayMode="page"
          />
        ) : null}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
