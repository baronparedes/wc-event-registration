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

import { Button, Dialog, Skeleton } from '@/components/ui';
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-3xl">
          Approvals Inbox
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Review and process pending Form Registrations and Long Leave volunteer requests.
        </p>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/10">
          <div className="text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Pending
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200">
            {metrics.pending}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs dark:border-emerald-900/40 dark:bg-emerald-950/10">
          <div className="text-xs font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Approved
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">
            {metrics.approved}
          </div>
        </div>
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 shadow-xs dark:border-rose-900/40 dark:bg-rose-950/10">
          <div className="text-xs font-medium uppercase tracking-wider text-rose-700 dark:text-rose-400">
            Declined
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-200">
            {metrics.rejected}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Total Shown
          </div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            {metrics.total}
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                selectedStatus === status
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-100'
                  : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Entity Type Selector */}
          <div className="relative">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value as ApprovalEntityType | 'all')}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
            >
              <option value="all">All Request Types</option>
              <option value="form_submission">Form Registrations</option>
              <option value="service_excuse">Long Leave Requests</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requester or title..."
              className="w-full sm:w-64 rounded-lg border border-neutral-300 bg-white py-1.5 pl-8 pr-3 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </div>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/50 p-6 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">
            {error?.message || 'Failed to load approval requests.'}
          </p>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface py-12 text-center">
          <Clock className="mx-auto h-8 w-8 text-neutral-400" />
          <h3 className="mt-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            No approval requests found
          </h3>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            There are no requests matching your selected filters.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      req.entity_type === 'form_submission'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                    }`}
                  >
                    {req.entity_type === 'form_submission' ? (
                      <FileText className="h-5 w-5" />
                    ) : (
                      <Calendar className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {req.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          req.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : req.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-400">
                      <span>{req.requester_name}</span>
                      {req.requester_email && (
                        <span className="ml-1 text-neutral-400">({req.requester_email})</span>
                      )}
                      <span className="mx-1.5 text-neutral-300 dark:text-neutral-600">•</span>
                      <span>
                        {new Date(req.created_at).toLocaleDateString(undefined, {
                          dateStyle: 'medium',
                        })}
                      </span>
                    </div>

                    {req.summary && (
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1">
                        {req.summary}
                      </p>
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
                    className="text-xs"
                  >
                    {req.status === 'pending' ? (
                      <>
                        Review & Decide
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <Eye className="mr-1 h-3.5 w-3.5" />
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
            <Dialog.Title className="flex items-center gap-2 text-lg">
              {inspectingRequest?.title}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                  inspectingRequest?.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : inspectingRequest?.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                }`}
              >
                {inspectingRequest?.status}
              </span>
            </Dialog.Title>
          </div>
          <Dialog.Description>Review Request Details</Dialog.Description>
        </Dialog.Header>

        <Dialog.Body className="space-y-4 py-3">
          {/* Context/Metadata overview */}
          {inspectingRequest?.metadata && (
            <div className="rounded-lg bg-neutral-50 p-3 text-xs dark:bg-neutral-800/60">
              <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                Request Metadata:
              </div>
              <div className="mt-1 space-y-1">
                {Object.entries(inspectingRequest.metadata).map(([key, val]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="font-medium text-neutral-500 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-neutral-800 dark:text-neutral-200">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If already decided, display decision record */}
          {inspectingRequest?.status !== 'pending' && (
            <div className="rounded-lg border border-neutral-200 p-3 text-xs dark:border-neutral-700">
              <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                Decision Record
              </div>
              <div className="mt-1 text-neutral-600 dark:text-neutral-400">
                Decided by {inspectingRequest?.decided_by_email || 'Administrator'} on{' '}
                {inspectingRequest?.decided_at &&
                  new Date(inspectingRequest.decided_at).toLocaleString()}
              </div>
              {inspectingRequest?.decision_notes && (
                <div className="mt-2 text-neutral-700 dark:text-neutral-300">
                  <span className="font-medium">Notes:</span> {inspectingRequest.decision_notes}
                </div>
              )}
            </div>
          )}

          {/* Decision Notes Input (Editable when pending) */}
          {inspectingRequest?.status === 'pending' && (
            <div>
              <label
                htmlFor="admin-decision-notes"
                className="block text-xs font-medium text-neutral-700 dark:text-neutral-300"
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
                className="mt-1 block w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-xs text-neutral-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          )}
        </Dialog.Body>

        <Dialog.Footer className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
    </div>
  );
}
export default AdminApprovalsPage;
