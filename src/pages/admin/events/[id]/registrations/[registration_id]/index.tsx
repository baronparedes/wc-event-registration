import { useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink, SectionCard } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ROUTE_PATHS,
  TOAST_MESSAGES,
  UI_MESSAGES,
  toAdminEventDetail,
  toAdminEventRegistrations,
} from '@/config/constants';
import { useAdminEventQuery } from '@/hooks/domain/events';
import {
  useCancelRegistrationMutation,
  useReactivateRegistrationMutation,
  useRegistrationDetailQuery,
} from '@/hooks/domain/registrations';
import { useErrorWithFadeout } from '@/hooks/utils';
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
    return String(answer);
  }

  if (fieldType === 'date' || fieldType === 'datetime') {
    if (typeof answer === 'string') {
      return new Date(answer).toLocaleDateString('en-US');
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

export function AdminRegistrationDetailPage() {
  const { id: eventId, registration_id: registrationId } = useParams<{
    id: string;
    registration_id: string;
  }>();
  const navigate = useNavigate();
  const { showError } = useErrorWithFadeout();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);

  const detailQuery = useRegistrationDetailQuery(registrationId ?? '');
  const eventQuery = useAdminEventQuery(eventId ?? '');
  const cancelMutation = useCancelRegistrationMutation(eventId ?? '');
  const reactivateMutation = useReactivateRegistrationMutation(eventId ?? '');

  if (!eventId || !registrationId) {
    return <div>Invalid registration ID</div>;
  }

  const isLoading = detailQuery.isLoading;
  const error = detailQuery.error;

  if (error) {
    return (
      <section className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <SectionCard title="Error">
          <p className="text-sm text-red-600">
            Error loading registration:{' '}
            {error instanceof Error ? error.message : UI_MESSAGES.errors.unknownError}
          </p>
        </SectionCard>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <SectionCard title="Loading">
          <p className="text-sm text-muted">{UI_MESSAGES.loading.registrationDetails}</p>
        </SectionCard>
      </section>
    );
  }

  const data = detailQuery.data;
  if (!data) {
    return (
      <section className="space-y-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <SectionCard title="Not Found">
          <p className="text-sm text-muted">{UI_MESSAGES.errors.registrationNotFound}</p>
        </SectionCard>
      </section>
    );
  }

  const { registration, member, fieldResponses } = data;

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({
        registration_id: registrationId,
      });
      setShowCancelDialog(false);
      // Refetch to update registration status
      detailQuery.refetch();
    } catch (error) {
      showError(error instanceof Error ? error.message : TOAST_MESSAGES.registration.cancelFailed);
    }
  };

  const canCancel = registration.status !== 'cancelled';

  const handleReactivate = async () => {
    try {
      await reactivateMutation.mutateAsync({
        registration_id: registrationId,
      });
      setShowReactivateDialog(false);
      // Refetch to update registration status
      detailQuery.refetch();
    } catch (error) {
      showError(
        error instanceof Error ? error.message : TOAST_MESSAGES.registration.reactivateFailed,
      );
    }
  };

  const pageActions = canCancel ? (
    <Button size="sm" variant="destructive" onClick={() => setShowCancelDialog(true)}>
      Cancel Registration
    </Button>
  ) : (
    <Button size="sm" variant="default" onClick={() => setShowReactivateDialog(true)}>
      Reactivate Registration
    </Button>
  );

  return (
    <>
      <AdminPageShell>
        <AdminPageShell.Header
          breadcrumbs={[
            { label: 'Events', to: ROUTE_PATHS.adminEvents },
            { label: eventQuery.data?.title ?? 'Event', to: toAdminEventDetail(eventId) },
            { label: 'Registrations', to: toAdminEventRegistrations(eventId) },
            { label: member.full_name },
          ]}
          title="Manage Registration"
          navLinks={
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <EventNavigationLinks eventId={eventId} currentSection="registrations-detail" />
              <ActionLink to={toAdminEventRegistrations(eventId)}>Back to Registrations</ActionLink>
            </div>
          }
          actions={pageActions}
        />
        <AdminPageShell.Content>
          <section className="space-y-4">
            {/* Member Card */}
            <SectionCard title="Member Information">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted">Member ID</p>
                    <p className="mt-1 text-base text-text">{member.member_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Full Name</p>
                    <p className="mt-1 text-base text-text">{member.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Email</p>
                    <p className="mt-1 text-base text-text">{member.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Phone</p>
                    <p className="mt-1 text-base text-text">{member.phone ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Role</p>
                    <p className="mt-1 text-base text-text">{member.role}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted">Category</p>
                    <p className="mt-1 text-base text-text">{member.category}</p>
                  </div>
                  {member.nickname && (
                    <div>
                      <p className="text-sm font-medium text-muted">Nickname</p>
                      <p className="mt-1 text-base text-text">{member.nickname}</p>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Registration Metadata */}
            <SectionCard title="Registration Details">
              <div className="space-y-4">
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
                  {registration.updated_at && (
                    <div>
                      <p className="text-sm font-medium text-muted">Last Updated</p>
                      <p className="mt-1 text-base text-text">
                        {formatDate(registration.updated_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Field Responses */}
            {fieldResponses.length > 0 && (
              <SectionCard title="Responses">
                <div className="space-y-4">
                  <div className="space-y-3">
                    {fieldResponses.map((response: (typeof fieldResponses)[number]) => (
                      <div
                        key={response.field_id}
                        className="border-b border-gray-100 pb-3 last:border-0"
                      >
                        <p className="text-sm font-medium text-muted">{response.field_label}</p>
                        <p className="mt-1 text-base text-text">
                          {formatAnswer(response.answer, response.field_type)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {fieldResponses.length === 0 && (
              <SectionCard title="Responses">
                <p className="text-sm text-muted">
                  No field responses recorded for this registration.
                </p>
              </SectionCard>
            )}
          </section>
        </AdminPageShell.Content>
      </AdminPageShell>

      <ConfirmDialog
        isOpen={showCancelDialog}
        onCancel={() => setShowCancelDialog(false)}
        title="Cancel Registration"
        description={
          <div className="space-y-4">
            <p className="text-gray-700">
              Are you sure you want to cancel this registration? This action cannot be undone.
            </p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
              <p className="text-sm text-gray-600">{member.member_id}</p>
              <p className="text-sm text-gray-600">{member.email}</p>
            </div>
          </div>
        }
        confirmLabel="Cancel Registration"
        confirmLoadingLabel="Cancelling..."
        confirmVariant="destructive"
        onConfirm={handleCancel}
        isPending={cancelMutation.isPending}
      />

      <ConfirmDialog
        isOpen={showReactivateDialog}
        onCancel={() => setShowReactivateDialog(false)}
        title="Reactivate Registration"
        description={
          <div className="space-y-4">
            <p className="text-gray-700">Restore this registration to active status?</p>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
              <p className="text-sm text-gray-600">{member.member_id}</p>
              <p className="text-sm text-gray-600">{member.email}</p>
            </div>
          </div>
        }
        confirmLabel="Reactivate Registration"
        confirmLoadingLabel="Reactivating..."
        onConfirm={handleReactivate}
        isPending={reactivateMutation.isPending}
      />
    </>
  );
}
