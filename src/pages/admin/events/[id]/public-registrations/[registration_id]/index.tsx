import { useState } from 'react';

import { useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink, SectionCard } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { ColorSwatchDisplay } from '@/components/ui/ColorSwatchDisplay';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ROUTE_PATHS,
  UI_MESSAGES,
  toAdminEventDetail,
  toAdminEventPublicRegistrations,
} from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventQuery } from '@/hooks/domain/events';
import {
  useCancelPublicRegistrationMutation,
  usePublicRegistrationDetailQuery,
  useReactivatePublicRegistrationMutation,
} from '@/hooks/domain/public-registrations';
import { useErrorWithFadeout } from '@/hooks/utils';
import { canWriteAdminData } from '@/lib/domain/auth';
import { EventNavigationLinks } from '@/pages/admin/events/components';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAnswer(answer: unknown, fieldType: string): string {
  if (answer === null || answer === undefined) {
    return '—';
  }

  if (fieldType === 'multi_select_toggle') {
    if (typeof answer === 'object' && answer !== null && !Array.isArray(answer)) {
      const entries = Object.entries(answer as Record<string, unknown>);
      return entries
        .map(
          ([key, value]) =>
            `${key}: ${value === true ? 'Yes' : value === false ? 'No' : String(value)}`,
        )
        .join(', ');
    }
    return String(answer);
  }

  if (fieldType === 'boolean') {
    return answer === true ? 'Yes' : answer === false ? 'No' : String(answer);
  }

  if (fieldType === 'multi_select' || fieldType === 'checkbox') {
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
  }

  return String(answer);
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'submitted':
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
          {UI_MESSAGES.registrationStatus.submitted}
        </span>
      );
    case 'updated':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          {UI_MESSAGES.registrationStatus.updated}
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
          {UI_MESSAGES.registrationStatus.cancelled}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-gray-50 px-3 py-1 text-sm font-medium text-gray-700">
          {status}
        </span>
      );
  }
}

export function AdminPublicRegistrationDetailPage() {
  const { id: eventId, registration_id: registrationId } = useParams<{
    id: string;
    registration_id: string;
  }>();
  const { showError } = useErrorWithFadeout();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);

  const detailQuery = usePublicRegistrationDetailQuery(registrationId ?? '');
  const eventQuery = useAdminEventQuery(eventId ?? '');
  const { data: authState } = useAdminAuthQuery();
  const cancelMutation = useCancelPublicRegistrationMutation(eventId ?? '');
  const reactivateMutation = useReactivatePublicRegistrationMutation(eventId ?? '');
  const canWrite = canWriteAdminData(authState?.adminRole);

  if (!eventId || !registrationId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Public Registration" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid public registration ID</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (detailQuery.error) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header
          title="Public Registration"
          navLinks={
            <ActionLink to={toAdminEventPublicRegistrations(eventId)}>
              Back to Public Registrations
            </ActionLink>
          }
        />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">
            Error loading public registration:{' '}
            {detailQuery.error instanceof Error ? detailQuery.error.message : 'Unknown error'}
          </p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (detailQuery.isLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Public Registration" />
        <AdminPageShell.Content
          isLoading={true}
          loadingMessage={UI_MESSAGES.loading.registrationDetails}
        >
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const data = detailQuery.data;
  if (!data) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header
          title="Public Registration"
          navLinks={
            <ActionLink to={toAdminEventPublicRegistrations(eventId)}>
              Back to Public Registrations
            </ActionLink>
          }
        />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Public registration not found.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const { registration, fieldResponses } = data;
  const canCancel = registration.status !== 'cancelled';

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ registration_id: registrationId });
      setShowCancelDialog(false);
      // Refetch to update registration status
      detailQuery.refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to cancel public registration');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync({ registration_id: registrationId });
      setShowReactivateDialog(false);
      // Refetch to update registration status
      detailQuery.refetch();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Failed to reactivate public registration',
      );
    }
  };

  const pageActions = canWrite ? (
    canCancel ? (
      <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
        Cancel Registration
      </Button>
    ) : (
      <Button variant="default" onClick={() => setShowReactivateDialog(true)}>
        Reactivate Registration
      </Button>
    )
  ) : undefined;

  return (
    <>
      <AdminPageShell>
        <AdminPageShell.Header
          breadcrumbs={[
            { label: 'Events', to: ROUTE_PATHS.adminEvents },
            { label: eventQuery.data?.title ?? 'Event', to: toAdminEventDetail(eventId) },
            { label: 'Public Registrations', to: toAdminEventPublicRegistrations(eventId) },
            { label: `${registration.first_name} ${registration.last_name}` },
          ]}
          title="Manage Public Registration"
          navLinks={
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <EventNavigationLinks
                eventId={eventId}
                currentSection="public-registrations-detail"
              />
              <ActionLink to={toAdminEventPublicRegistrations(eventId)}>
                Back to Public Registrations
              </ActionLink>
            </div>
          }
          actions={pageActions}
        />
        <AdminPageShell.Content>
          <section className="space-y-4">
            <SectionCard title="Attendee Information">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted">Full Name</p>
                  <p className="mt-1 text-base text-text">
                    {registration.first_name} {registration.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Email</p>
                  <p className="mt-1 text-base text-text">{registration.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Phone</p>
                  <p className="mt-1 text-base text-text">{registration.phone ?? '—'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Nickname</p>
                  <p className="mt-1 text-base text-text">{registration.nickname ?? '—'}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Registration Details">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted">Status</p>
                  <p className="mt-1">{getStatusBadge(registration.status)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Submitted</p>
                  <p className="mt-1 text-base text-text">
                    {formatDate(registration.submitted_at)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted">Last Updated</p>
                  <p className="mt-1 text-base text-text">{formatDate(registration.updated_at)}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Responses">
              {fieldResponses.length === 0 ? (
                <p className="text-sm text-muted">
                  No field responses recorded for this registration.
                </p>
              ) : (
                <div className="space-y-3">
                  {fieldResponses.map((response) => (
                    <div
                      key={response.field_id}
                      className="border-b border-gray-100 pb-3 last:border-0"
                    >
                      <p className="text-sm font-medium text-muted">{response.field_label}</p>
                      <p className="mt-1 text-base text-text">
                        {response.field_type === 'color_picker' ? (
                          <ColorSwatchDisplay
                            value={formatAnswer(response.answer, response.field_type)}
                          />
                        ) : (
                          formatAnswer(response.answer, response.field_type)
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>
        </AdminPageShell.Content>
      </AdminPageShell>
      {canWrite && (
        <ConfirmDialog
          isOpen={showCancelDialog}
          onCancel={() => setShowCancelDialog(false)}
          title="Cancel Public Registration"
          description={
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to cancel this public registration? This action cannot be
                undone.
              </p>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">
                  {registration.first_name} {registration.last_name}
                </p>
                <p className="text-sm text-gray-600">{registration.email}</p>
              </div>
            </div>
          }
          confirmLabel="Cancel Registration"
          confirmLoadingLabel="Cancelling..."
          confirmVariant="destructive"
          onConfirm={handleCancel}
          isPending={cancelMutation.isPending}
        />
      )}

      {canWrite && (
        <ConfirmDialog
          isOpen={showReactivateDialog}
          onCancel={() => setShowReactivateDialog(false)}
          title="Reactivate Public Registration"
          description={
            <div className="space-y-4">
              <p className="text-gray-700">Restore this public registration to active status?</p>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">
                  {registration.first_name} {registration.last_name}
                </p>
                <p className="text-sm text-gray-600">{registration.email}</p>
              </div>
            </div>
          }
          confirmLabel="Reactivate Registration"
          confirmLoadingLabel="Reactivating..."
          onConfirm={handleReactivate}
          isPending={reactivateMutation.isPending}
        />
      )}
    </>
  );
}
