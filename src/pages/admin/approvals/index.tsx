import { useMemo, useState } from 'react';

import { AlertCircle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import {
  useApprovalRequestsQuery,
  useDelegateApprovalMutation,
  useSlodUsersQuery,
  useSubmitApprovalDecisionMutation,
} from '@/hooks/domain/approvals';
import { useIsMobileViewport } from '@/hooks/utils';
import type { ApprovalEntityType, ApprovalRequest, ApprovalStatus } from '@/lib/domain/approvals';

import {
  ApprovalFiltersToolbar,
  ApprovalInspectDialog,
  ApprovalMetricsCards,
  ApprovalsMobileList,
  ApprovalsTable,
} from './components';

export function AdminApprovalsPage() {
  const isMobileViewport = useIsMobileViewport();
  const [selectedStatus, setSelectedStatus] = useState<ApprovalStatus | 'all'>('pending');
  const [selectedEntity, setSelectedEntity] = useState<ApprovalEntityType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingRequest, setInspectingRequest] = useState<ApprovalRequest | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [delegatedEmail, setDelegatedEmail] = useState('');

  const {
    data: allRequests = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useApprovalRequestsQuery({
    status: 'all',
    entity_type: selectedEntity,
    search: searchQuery,
  });

  const requests = useMemo(() => {
    if (selectedStatus === 'all') return allRequests;
    return allRequests.filter((r) => r.status === selectedStatus);
  }, [allRequests, selectedStatus]);

  const { data: slodUsers = [], isLoading: isLoadingSlod } = useSlodUsersQuery();
  const { mutate: delegateApproval, isPending: isDelegating } = useDelegateApprovalMutation();
  const { mutate: submitDecision, isPending: isSubmitting } = useSubmitApprovalDecisionMutation();

  const attestationAnswers = useMemo(() => {
    if (!inspectingRequest?.metadata?.attestation_answers) return null;
    const raw = inspectingRequest.metadata.attestation_answers;
    if (typeof raw === 'object' && raw !== null) {
      return raw as Record<string, unknown>;
    }
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }, [inspectingRequest?.metadata?.attestation_answers]);

  const openInspectRequest = (req: ApprovalRequest) => {
    setInspectingRequest(req);
    setDecisionNotes(req.decision_notes || '');
    setDelegatedEmail(req.assigned_to_email || '');
  };

  const closeInspectRequest = () => {
    setInspectingRequest(null);
    setDecisionNotes('');
    setDelegatedEmail('');
  };

  // Metrics calculation across requests
  const metrics = useMemo(() => {
    const total = allRequests.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    allRequests.forEach((r) => {
      if (r.status === 'pending') pending++;
      else if (r.status === 'approved') approved++;
      else if (r.status === 'rejected') rejected++;
    });

    return { total, pending, approved, rejected };
  }, [allRequests]);

  const handleDelegate = () => {
    if (!inspectingRequest || !delegatedEmail) return;
    const slodUser = slodUsers.find((u) => u.email.toLowerCase() === delegatedEmail.toLowerCase());

    delegateApproval(
      {
        approval_id: inspectingRequest.id,
        assigned_to_email: delegatedEmail,
        assigned_to_user_id: slodUser?.auth_user_id,
      },
      {
        onSuccess: () => {
          toast.success(
            `Review delegated to ${slodUser?.name ? `${slodUser.name} (${delegatedEmail})` : delegatedEmail}`,
          );
          setInspectingRequest((prev) =>
            prev
              ? {
                  ...prev,
                  assigned_to_email: delegatedEmail,
                  assigned_to_user_id: slodUser?.auth_user_id || prev.assigned_to_user_id,
                }
              : null,
          );
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to delegate approval');
        },
      },
    );
  };

  const handleDecision = (decision: 'approved' | 'rejected') => {
    if (!inspectingRequest) return;

    if (decision === 'rejected' && !decisionNotes.trim()) {
      toast.error('Please enter a note explaining why this request is being declined.');
      return;
    }

    submitDecision(
      {
        approval_id: inspectingRequest.id,
        decision,
        notes: decisionNotes.trim() || null,
      },
      {
        onSuccess: (data) => {
          toast.success(data.message || `Request ${decision} successfully`);
          closeInspectRequest();
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to submit decision');
        },
      },
    );
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Approvals' }]}
        title="Approvals Inbox"
        description="Review and process pending Form Registrations, Long Leave requests, and Endorsements."
      />

      <AdminBaseNavigation />

      {/* Metrics Bar */}
      <ApprovalMetricsCards metrics={metrics} />

      {/* Filters & Search */}
      <ApprovalFiltersToolbar
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedEntity={selectedEntity}
        onEntityChange={setSelectedEntity}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery('')}
      />

      {/* Content Area */}
      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading approval requests...">
        {isError && (
          <div className="flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-5 text-danger">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              {error?.message || 'Failed to load approval requests.'}
            </p>
          </div>
        )}

        {!isError && requests.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center">
            <EmptyState
              icon={<UserCheck className="h-6 w-6 text-muted" />}
              title="No approval requests found"
              description="There are no requests matching your selected status and search filters."
            />
          </div>
        )}

        {!isError && requests.length > 0 && (
          <div>
            {isMobileViewport ? (
              <ApprovalsMobileList requests={requests} onInspect={openInspectRequest} />
            ) : (
              <ApprovalsTable requests={requests} onInspect={openInspectRequest} />
            )}
          </div>
        )}
      </AdminPageShell.Content>

      {/* Review & Decide Modal */}
      <ApprovalInspectDialog
        request={inspectingRequest}
        onClose={closeInspectRequest}
        slodUsers={slodUsers}
        isLoadingSlod={isLoadingSlod}
        delegatedEmail={delegatedEmail}
        onDelegatedEmailChange={setDelegatedEmail}
        onDelegate={handleDelegate}
        isDelegating={isDelegating}
        decisionNotes={decisionNotes}
        onDecisionNotesChange={setDecisionNotes}
        onDecision={handleDecision}
        isSubmitting={isSubmitting}
        attestationAnswers={attestationAnswers}
      />
    </AdminPageShell>
  );
}

export default AdminApprovalsPage;
