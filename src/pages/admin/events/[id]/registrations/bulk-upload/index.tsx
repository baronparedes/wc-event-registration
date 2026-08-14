import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import {
  ROUTE_PATHS,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
} from '@/config/constants';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useDownloadRegistrationsTemplateMutation } from '@/hooks/domain/registrations';
import { BulkUploadPanel } from '@/pages/admin/events/[id]/registrations/bulk-upload/components/BulkUploadPanel';
import { EventNavigationLinks } from '@/pages/admin/events/components';

export function AdminRegistrationsBulkUploadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: allFields = [], isLoading: fieldsLoading } = useAdminEventFieldsQuery(id);
  const fields = allFields.filter((field) => field.is_active);
  const downloadMutation = useDownloadRegistrationsTemplateMutation(id ?? '');

  const isLoading = eventLoading || fieldsLoading;

  const actions = (
    <Button
      variant="primaryOutline"
      disabled={downloadMutation.isPending}
      onClick={async () => {
        if (!id) return;

        try {
          const { text, filename } = await downloadMutation.mutateAsync();
          const blob = new Blob([text], { type: 'text/csv; charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename ?? `event-${id}-registrations-template.csv`;
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to download registrations template.';
          toast.error(message);
        }
      }}
    >
      {downloadMutation.isPending ? 'Downloading...' : 'Download CSV Template'}
    </Button>
  );

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: id ? toAdminEventDetail(id) : undefined },
          { label: 'Registrations', to: id ? toAdminEventRegistrations(id) : undefined },
          { label: 'Bulk CSV Upload' },
        ]}
        navLinks={
          id ? <EventNavigationLinks eventId={id} currentSection="registrations" /> : undefined
        }
        title="Bulk CSV Upload"
        description={
          event ? `Upload registrations in bulk for ${event.title}` : 'Upload registrations in bulk'
        }
        actions={actions}
      />

      {!isLoading && fields.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">No registration fields configured</p>
          <p className="mt-1 text-xs text-blue-700">
            {id ? (
              <>
                <ActionLink to={toAdminEventFields(id)}>Configure registration fields</ActionLink>{' '}
                first, or upload a CSV with only member_id to register members without answers.
              </>
            ) : (
              'Configure registration fields first, or upload a CSV with only member_id to register members without answers.'
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
        ) : (
          <BulkUploadPanel
            eventId={id ?? ''}
            fields={fields}
            onClose={() => navigate(id ? toAdminEventRegistrations(id) : ROUTE_PATHS.adminEvents)}
            displayMode="page"
          />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
