import { useMemo, useState } from 'react';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { Button, Dialog, EmptyState, Skeleton } from '@/components/ui';
import {
  useApprovalRequestsQuery,
  useSubmitApprovalDecisionMutation,
} from '@/hooks/domain/approvals';
import type { ApprovalEntityType, ApprovalRequest, ApprovalStatus } from '@/lib/domain/approvals';

export function AdminApprovalsPage() {
  const [selectedStatus, setSelectedStatus] = useState<ApprovalStatus | 'all'>('pending');
  const [selectedEntity, setSelectedEntity] = useState<ApprovalEntityType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingRequest, setInspectingRequest] = useState<ApprovalRequest | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  const {
    data: requests = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useApprovalRequestsQuery({
    status: selectedStatus,
    entity_type: selectedEntity,
    search: searchQuery,
  });

  const { mutate: submitDecision, isPending: isSubmitting } = useSubmitApprovalDecisionMutation();

  // Metrics calculation across requests
  const metrics = useMemo(() => {
    const total = requests.length;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    requests.forEach((r) => {
      if (r.status === 'pending') pending++;
      else if (r.status === 'approved') approved++;
      else if (r.status === 'rejected') rejected++;
    });

    return { total, pending, approved, rejected };
  }, [requests]);

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
          setInspectingRequest(null);
          setDecisionNotes('');
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
        description="Review and process pending Form Registrations and Long Leave volunteer requests."
      />

      <AdminBaseNavigation />

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-300/60 bg-amber-50/70 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Pending
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900">{metrics.pending}</div>
        </div>
        <div className="rounded-xl border border-emerald-300/60 bg-emerald-50/70 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Approved
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{metrics.approved}</div>
        </div>
        <div className="rounded-xl border border-rose-300/60 bg-rose-50/70 p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-700">
            Declined
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-900">{metrics.rejected}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted">
            Total Shown
          </div>
          <div className="mt-1 text-2xl font-bold text-text">{metrics.total}</div>
        </div>
      </div>

      {/* Filters & Search */}
      <AdminPageShell.Filters>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Pills */}
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1 shadow-xs">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setSelectedStatus(status)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                  selectedStatus === status
                    ? 'bg-primary text-white font-semibold shadow-xs'
                    : 'text-muted hover:text-text hover:bg-slate-100/60'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Entity Selector */}
            <div className="relative">
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value as ApprovalEntityType | 'all')}
                className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-text shadow-xs focus:border-primary focus:outline-hidden"
              >
                <option value="all">All Request Types</option>
                <option value="form_submission">Form Registrations</option>
                <option value="service_excuse">Long Leave Requests</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search requester or title..."
                className="w-full sm:w-64 rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-xs text-text placeholder:text-muted shadow-xs focus:border-primary focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </AdminPageShell.Filters>

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-rose-600">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">
            {error?.message || 'Failed to load approval requests.'}
          </p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12">
          <EmptyState
            icon={<Clock className="h-6 w-6 text-muted" />}
            title="No approval requests found"
            description="There are no requests matching your selected filters."
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
          <div className="divide-y divide-border">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      req.entity_type === 'form_submission'
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}
                  >
                    {req.entity_type === 'form_submission' ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <Calendar className="h-5 w-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text">{req.title}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center text-xs text-muted">
                      <span className="font-medium text-text">{req.requester_name}</span>
                      {req.requester_email && (
                        <span className="ml-1 text-muted">({req.requester_email})</span>
                      )}
                      <span className="mx-2 text-border">•</span>
                      <span>
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          dateStyle: 'medium',
                        })}
                      </span>
                    </div>

                    {req.summary && (
                      <p className="text-xs text-muted line-clamp-1">{req.summary}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant={req.status === 'pending' ? 'default' : 'outline'}
                    onClick={() => {
                      setInspectingRequest(req);
                      setDecisionNotes(req.decision_notes || '');
                    }}
                    className="text-xs font-semibold gap-1.5"
                  >
                    {req.status === 'pending' ? (
                      <>
                        Review & Decide
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Details
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review & Decide Modal */}
      <Dialog
        isOpen={Boolean(inspectingRequest)}
        onClose={() => {
          setInspectingRequest(null);
          setDecisionNotes('');
        }}
        size="lg"
      >
        <Dialog.Header>
          <div className="flex items-center gap-2">
            <Dialog.Title className="flex items-center gap-2 text-lg text-text font-bold">
              {inspectingRequest?.title}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                  inspectingRequest?.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : inspectingRequest?.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {inspectingRequest?.status}
              </span>
            </Dialog.Title>
          </div>
          <Dialog.Description className="text-xs text-muted">
            Review request details and apply administrative decisions.
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body className="space-y-4 py-3">
          {/* Context/Metadata overview */}
          {inspectingRequest?.metadata && (
            <div className="rounded-xl border border-border bg-slate-50/70 p-3.5 text-xs">
              <div className="font-semibold text-text">Request Metadata:</div>
              <div className="mt-2 space-y-1.5">
                {Object.entries(inspectingRequest.metadata).map(([key, val]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="font-medium text-muted capitalize min-w-28">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-text font-medium">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If already decided, display decision record */}
          {inspectingRequest?.status !== 'pending' && (
            <div className="rounded-xl border border-border bg-surface p-3.5 text-xs">
              <div className="font-semibold text-text">Decision Record</div>
              <div className="mt-1 text-muted">
                Decided by {inspectingRequest?.decided_by_email || 'Administrator'} on{' '}
                {inspectingRequest?.decided_at &&
                  new Date(inspectingRequest.decided_at).toLocaleString()}
              </div>
              {inspectingRequest?.decision_notes && (
                <div className="mt-2 text-text">
                  <span className="font-semibold">Notes:</span> {inspectingRequest.decision_notes}
                </div>
              )}
            </div>
          )}

          {/* Decision Notes Input (Editable when pending) */}
          {inspectingRequest?.status === 'pending' && (
            <div>
              <label
                htmlFor="admin-decision-notes"
                className="block text-xs font-semibold text-text mb-1"
              >
                Decision Notes (Optional for approval, required if declining)
              </label>
              <textarea
                id="admin-decision-notes"
                rows={3}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Enter any guidance, conditional notes, or decline reason..."
                disabled={isSubmitting}
                className="block w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-text placeholder:text-muted shadow-xs focus:border-primary focus:outline-hidden"
              />
            </div>
          )}
        </Dialog.Body>

        <Dialog.Footer className="flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => setInspectingRequest(null)}
          >
            Close
          </Button>

          {inspectingRequest?.status === 'pending' && (
            <>
              <Button
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => handleDecision('rejected')}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Decline
              </Button>

              <Button
                type="button"
                variant="default"
                disabled={isSubmitting}
                onClick={() => handleDecision('approved')}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Approve Request
              </Button>
            </>
          )}
        </Dialog.Footer>
      </Dialog>
    </AdminPageShell>
  );
}

export default AdminApprovalsPage;
