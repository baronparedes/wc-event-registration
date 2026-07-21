import { useState } from 'react';

import { ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { UI_MESSAGES, toAdminPublicRegistrationDetail } from '@/config/constants';
import {
  useCancelPublicRegistrationMutation,
  useReactivatePublicRegistrationMutation,
} from '@/hooks/domain/public-registrations';
import { useErrorWithFadeout } from '@/hooks/utils';
import type { PublicRegistrationSummary } from '@/lib/domain/public-registrations';

interface PublicRegistrationsListProps {
  registrations: PublicRegistrationSummary[];
  isLoading?: boolean;
  eventId: string;
  isEventArchived?: boolean;
  searchTerm?: string;
  canWrite?: boolean;
}

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

function fullName(registration: PublicRegistrationSummary): string {
  return `${registration.first_name} ${registration.last_name}`.trim();
}

export function PublicRegistrationsList({
  registrations,
  isLoading,
  eventId,
  isEventArchived,
  searchTerm,
  canWrite = true,
}: PublicRegistrationsListProps) {
  const navigate = useNavigate();
  const [selectedRegistration, setSelectedRegistration] =
    useState<PublicRegistrationSummary | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const cancelMutation = useCancelPublicRegistrationMutation(eventId);
  const reactivateMutation = useReactivatePublicRegistrationMutation(eventId);
  const { showError } = useErrorWithFadeout();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-gray-500">{UI_MESSAGES.loading.registrations}</div>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="px-6 py-12">
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title={
            searchTerm && searchTerm.length > 0 ? 'No matches found' : 'No public registrations yet'
          }
          description={
            searchTerm && searchTerm.length > 0
              ? 'Try adjusting your search filters'
              : 'Public self-registrations will appear here once attendees submit for this event'
          }
        />
      </div>
    );
  }

  const handleCancelClick = (registration: PublicRegistrationSummary) => {
    setSelectedRegistration(registration);
    setShowCancelDialog(true);
  };

  const handleReactivateClick = (registration: PublicRegistrationSummary) => {
    setSelectedRegistration(registration);
    setShowReactivateDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedRegistration) return;

    try {
      await cancelMutation.mutateAsync({ registration_id: selectedRegistration.id });
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to cancel public registration');
    } finally {
      setShowCancelDialog(false);
      setSelectedRegistration(null);
    }
  };

  const handleConfirmReactivate = async () => {
    if (!selectedRegistration) return;

    try {
      await reactivateMutation.mutateAsync({ registration_id: selectedRegistration.id });
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Failed to reactivate public registration',
      );
    } finally {
      setShowReactivateDialog(false);
      setSelectedRegistration(null);
    }
  };

  return (
    <>
      <ListTable density="dense">
        <ListTableHead>
          <ListTableHeaderRow variant="plain">
            <ListTableHeaderCell>Source</ListTableHeaderCell>
            <ListTableHeaderCell>Name</ListTableHeaderCell>
            <ListTableHeaderCell>Email</ListTableHeaderCell>
            <ListTableHeaderCell>Phone</ListTableHeaderCell>
            <ListTableHeaderCell>Status</ListTableHeaderCell>
            <ListTableHeaderCell>Submitted</ListTableHeaderCell>
            <ListTableHeaderCell>Actions</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody divider="none">
          {registrations.map((registration) => (
            <ListTableRow
              key={registration.id}
              className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50"
              onClick={() => navigate(toAdminPublicRegistrationDetail(eventId, registration.id))}
            >
              <ListTableCell className="text-gray-600">Public</ListTableCell>
              <ListTableCell className="text-gray-900">{fullName(registration)}</ListTableCell>
              <ListTableCell className="text-gray-600">{registration.email}</ListTableCell>
              <ListTableCell className="text-gray-600">{registration.phone ?? '-'}</ListTableCell>
              <ListTableCell>{getStatusBadge(registration.status)}</ListTableCell>
              <ListTableCell className="text-gray-600">
                {formatDate(registration.submitted_at)}
              </ListTableCell>
              <ListTableCell>
                <div className="flex items-center gap-2">
                  <ActionLink to={toAdminPublicRegistrationDetail(eventId, registration.id)}>
                    View
                  </ActionLink>
                  {canWrite &&
                    (registration.status === 'cancelled' ? (
                      <button
                        onClick={() => handleReactivateClick(registration)}
                        disabled={isEventArchived}
                        className={`text-sm font-medium ${
                          isEventArchived
                            ? 'cursor-not-allowed text-gray-400'
                            : 'text-green-700 hover:text-green-800'
                        }`}
                        title={
                          isEventArchived
                            ? 'Cannot reactivate registrations for archived events'
                            : ''
                        }
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelClick(registration)}
                        disabled={isEventArchived}
                        className={`text-sm font-medium ${
                          isEventArchived
                            ? 'cursor-not-allowed text-gray-400'
                            : 'text-red-600 hover:text-red-700'
                        }`}
                        title={
                          isEventArchived ? 'Cannot cancel registrations for archived events' : ''
                        }
                      >
                        Cancel
                      </button>
                    ))}
                </div>
              </ListTableCell>
            </ListTableRow>
          ))}
        </ListTableBody>
      </ListTable>

      {canWrite && selectedRegistration && (
        <ConfirmDialog
          isOpen={showCancelDialog}
          onCancel={() => {
            setShowCancelDialog(false);
            setSelectedRegistration(null);
          }}
          title="Cancel Public Registration"
          description={
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to cancel this public registration? This action cannot be
                undone.
              </p>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">
                  {fullName(selectedRegistration)}
                </p>
                <p className="text-sm text-gray-600">{selectedRegistration.email}</p>
              </div>
            </div>
          }
          confirmLabel="Cancel Registration"
          confirmLoadingLabel="Cancelling..."
          confirmVariant="destructive"
          onConfirm={handleConfirmCancel}
          isPending={cancelMutation.isPending}
        />
      )}

      {canWrite && selectedRegistration && (
        <ConfirmDialog
          isOpen={showReactivateDialog}
          onCancel={() => {
            setShowReactivateDialog(false);
            setSelectedRegistration(null);
          }}
          title="Reactivate Public Registration"
          description={
            <div className="space-y-4">
              <p className="text-gray-700">Restore this public registration to active status?</p>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">
                  {fullName(selectedRegistration)}
                </p>
                <p className="text-sm text-gray-600">{selectedRegistration.email}</p>
              </div>
            </div>
          }
          confirmLabel="Reactivate Registration"
          confirmLoadingLabel="Reactivating..."
          onConfirm={handleConfirmReactivate}
          isPending={reactivateMutation.isPending}
        />
      )}
    </>
  );
}
