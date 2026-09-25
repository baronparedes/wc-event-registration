import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { ActionLink, AlertBanner, Button } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useDownloadRegistrationsTemplateMutation } from '@/hooks/domain/registrations';
import { BulkUploadPanel } from '@/pages/admin/events/[id]/registrations/bulk-upload/components/BulkUploadPanel';
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

        const fallbackFilename = `event-${id}-registrations-template.csv`;
        try {
          const { text, filename } = await downloadMutation.mutateAsync();
          downloadCsv(text, filename || fallbackFilename);
        } catch (error) {
          let message = 'Failed to download registrations template.';
          if (error instanceof Error) {
            message = error.message;
          }
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
          {
            label: event?.title ?? 'Event',
            to: id ? toRoute('adminEventDetail', { id }) : undefined,
          },
          { label: 'Registrations', to: id ? toRoute('adminRegistrations', { id }) : undefined },
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
        <AlertBanner
          variant="info"
          title="No registration fields configured"
          description={
            id ? (
              <>
                <ActionLink to={toRoute('adminEventFields', { id })}>
                  Configure registration fields
                </ActionLink>{' '}
                first, or upload a CSV with only member_id to register members without answers.
              </>
            ) : (
              'Configure registration fields first, or upload a CSV with only member_id to register members without answers.'
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
        ) : (
          <BulkUploadPanel
            eventId={id ?? ''}
            fields={fields}
            onClose={() =>
              navigate(id ? toRoute('adminRegistrations', { id }) : ROUTE_PATHS.adminEvents)
            }
            displayMode="page"
          />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
