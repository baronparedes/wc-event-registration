import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import {
  ROUTE_PATHS,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventPublicRegistrations,
} from '@/config/constants';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useDownloadPublicRegistrationsTemplateMutation } from '@/hooks/domain/public-registrations';
import { BulkUploadPanel } from '@/pages/admin/events/[id]/public-registrations/bulk-upload/components/BulkUploadPanel';
import { EventNavigationLinks } from '@/pages/admin/events/components';

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
          { label: event?.title ?? 'Event', to: id ? toAdminEventDetail(id) : undefined },
          {
            label: 'Public Registrations',
            to: id ? toAdminEventPublicRegistrations(id) : undefined,
          },
          { label: 'Bulk CSV Upload' },
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
                try {
                  const { text, filename } = await downloadTemplateMutation.mutateAsync();
                  const blob = new Blob([text], { type: 'text/csv; charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = filename ?? `event-${id}-public-registrations-template.csv`;
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  const message =
                    error instanceof Error
                      ? error.message
                      : 'Failed to download public registrations template.';
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
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            No public registration fields configured
          </p>
          <p className="mt-1 text-xs text-blue-700">
            {id ? (
              <>
                <ActionLink to={toAdminEventFields(id)}>Configure registration fields</ActionLink>{' '}
                first, or upload a CSV with only first_name, last_name, and email to import public
                registrations without answers.
              </>
            ) : (
              'Configure registration fields first, or upload a CSV with only first_name, last_name, and email to import public registrations without answers.'
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
            onClose={() =>
              navigate(id ? toAdminEventPublicRegistrations(id) : ROUTE_PATHS.adminEvents)
            }
            displayMode="page"
          />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
