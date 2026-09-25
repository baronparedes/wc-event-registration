import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { ActionLink, AlertBanner, Button } from '@/components/ui';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useDownloadPublicRegistrationsTemplateMutation } from '@/hooks/domain/public-registrations';
import { BulkUploadPanel } from '@/pages/admin/events/[id]/public-registrations/bulk-upload/components/BulkUploadPanel';
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

export function AdminPublicRegistrationsBulkUploadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: allFields = [], isLoading: fieldsLoading } = useAdminEventFieldsQuery(id);
  const fields = allFields.filter((field) => field.is_active && field.applicability !== 'members');
  const downloadTemplateMutation = useDownloadPublicRegistrationsTemplateMutation(id ?? '');

  const isLoading = eventLoading || fieldsLoading;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          {
            label: event?.title ?? 'Event',
            to: id ? toRoute('adminEventDetail', { id }) : undefined,
          },
          {
            label: 'Public Registrations',
            to: id ? toRoute('adminPublicRegistrations', { id }) : undefined,
          },
          { label: 'Bulk Upload' },
        ]}
        navLinks={
          id ? (
            <EventNavigationLinks eventId={id} currentSection="public-registrations" />
          ) : undefined
        }
        title="Bulk CSV Upload"
        description={
          event
            ? `Upload public registrations in bulk for ${event.title}`
            : 'Upload public registrations in bulk'
        }
        actions={
          <>
            <Button
              variant="primaryOutline"
              disabled={downloadTemplateMutation.isPending}
              onClick={async () => {
                const fallbackFilename = `event-${id}-public-registrations-template.csv`;
                try {
                  const { text, filename } = await downloadTemplateMutation.mutateAsync();
                  downloadCsv(text, filename || fallbackFilename);
                } catch (error) {
                  let message = 'Failed to download public registrations template.';
                  if (error instanceof Error) {
                    message = error.message;
                  }
                  toast.error(message);
                }
              }}
            >
              {downloadTemplateMutation.isPending ? 'Downloading...' : 'Download CSV Template'}
            </Button>
          </>
        }
      />

      {!isLoading && fields.length === 0 && (
        <AlertBanner
          variant="info"
          title="No public registration fields configured"
          description={
            id ? (
              <>
                <ActionLink to={toRoute('adminEventFields', { id })}>
                  Configure registration fields
                </ActionLink>{' '}
                first, or upload a CSV with only first_name, last_name, and email to import public
                registrations without answers.
              </>
            ) : (
              'Configure registration fields first, or upload a CSV with only first_name, last_name, and email to import public registrations without answers.'
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
              navigate(id ? toRoute('adminPublicRegistrations', { id }) : ROUTE_PATHS.adminEvents)
            }
            displayMode="page"
          />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
