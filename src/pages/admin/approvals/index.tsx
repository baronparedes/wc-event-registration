import { useMemo, useState } from 'react';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import {
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Dialog,
  EmptyState,
  FormSelectField,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  MobileCard,
  MobileCardActions,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardHeader,
  SearchInputField,
} from '@/components/ui';
import {
  useApprovalRequestsQuery,
  useDelegateApprovalMutation,
  useSlodUsersQuery,
  useSubmitApprovalDecisionMutation,
} from '@/hooks/domain/approvals';
import { useIsMobileViewport } from '@/hooks/utils';
import type { ApprovalEntityType, ApprovalRequest, ApprovalStatus } from '@/lib/domain/approvals';
import { formatDateOnly } from '@/lib/infrastructure';

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
        description="Review and process pending Form Registrations and Long Leave volunteer requests."
      />

      <AdminBaseNavigation />

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Pending Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Pending
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/20 text-accent">
              <Clock className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold text-text tabular-nums">
              {metrics.pending}
            </div>
            <p className="mt-0.5 text-xs text-muted">Awaiting review</p>
          </div>
        </div>

        {/* Approved Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Approved
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold text-text tabular-nums">
              {metrics.approved}
            </div>
            <p className="mt-0.5 text-xs text-muted">Approved & active</p>
          </div>
        </div>

        {/* Declined Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Declined
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-danger/10 text-danger">
              <XCircle className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold text-text tabular-nums">
              {metrics.rejected}
            </div>
            <p className="mt-0.5 text-xs text-muted">Declined requests</p>
          </div>
        </div>

        {/* Total Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Total Shown
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
              <Inbox className="h-4 w-4" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-3">
            <div className="font-heading text-2xl font-bold text-text tabular-nums">
              {metrics.total}
            </div>
            <p className="mt-0.5 text-xs text-muted">Matching current filters</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <AdminPageShell.Filters>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ButtonGroup
            size="sm"
            value={selectedStatus}
            onChange={(val) => setSelectedStatus(val as ApprovalStatus | 'all')}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Declined' },
              { value: 'all', label: 'All' },
            ]}
          />

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="w-full sm:w-48">
              <FormSelectField
                ariaLabel="Request Type"
                value={selectedEntity}
                onChange={(value) => setSelectedEntity(value as ApprovalEntityType | 'all')}
                options={[
                  { value: 'all', label: 'All Request Types' },
                  { value: 'form_submission', label: 'Form Registrations' },
                  { value: 'service_excuse', label: 'Long Leave Requests' },
                ]}
              />
            </div>

            <div className="w-full sm:w-64">
              <SearchInputField
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                placeholder="Search requester or title..."
              />
            </div>
          </div>
        </div>
      </AdminPageShell.Filters>

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
              /* Mobile Card View */
              <div className="space-y-3 pb-3">
                {requests.map((req) => (
                  <MobileCard key={req.id}>
                    <MobileCardBody>
                      <MobileCardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <Badge
                              variant={
                                req.entity_type === 'form_submission' ? 'secondary' : 'outline'
                              }
                              className="mb-1.5"
                            >
                              {req.entity_type === 'form_submission'
                                ? 'Form Registration'
                                : 'Long Leave'}
                            </Badge>
                            <h3 className="font-heading font-semibold text-text truncate">
                              {req.title}
                            </h3>
                          </div>
                          <Badge
                            variant={
                              req.status === 'approved'
                                ? 'default'
                                : req.status === 'rejected'
                                  ? 'destructive'
                                  : 'accent'
                            }
                          >
                            {req.status}
                          </Badge>
                        </div>
                      </MobileCardHeader>

                      <MobileCardContent>
                        <MobileCardContentItem label="Requester">
                          <div className="flex items-center gap-2.5 mt-0.5">
                            <Avatar
                              name={req.requester_name}
                              avatarObjectKey={req.requester_avatar_object_key}
                              size="xs"
                            />
                            <div className="min-w-0">
                              <span className="font-medium text-text block truncate">
                                {req.requester_name}
                              </span>
                              {req.requester_email && (
                                <span className="block text-xs text-muted truncate">
                                  {req.requester_email}
                                </span>
                              )}
                            </div>
                          </div>
                        </MobileCardContentItem>
                        <MobileCardContentItem label="Date">
                          <span className="text-text">{formatDateOnly(req.created_at)}</span>
                        </MobileCardContentItem>
                        {req.assigned_to_email && (
                          <MobileCardContentItem label="Assigned">
                            <span className="text-xs text-muted truncate">
                              {req.assigned_to_email}
                            </span>
                          </MobileCardContentItem>
                        )}
                        {req.summary && (
                          <MobileCardContentItem label="Details">
                            <span className="text-muted line-clamp-2">{req.summary}</span>
                          </MobileCardContentItem>
                        )}
                      </MobileCardContent>

                      <MobileCardActions>
                        <Button
                          className="w-full"
                          size="sm"
                          variant={req.status === 'pending' ? 'default' : 'outline'}
                          onClick={() => openInspectRequest(req)}
                        >
                          {req.status === 'pending' ? 'Review & Decide' : 'View Details'}
                        </Button>
                      </MobileCardActions>
                    </MobileCardBody>
                  </MobileCard>
                ))}
              </div>
            ) : (
              /* Desktop ListTable */
              <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xs">
                <ListTable>
                  <ListTableHead>
                    <ListTableHeaderRow>
                      <ListTableHeaderCell className="px-6">Request</ListTableHeaderCell>
                      <ListTableHeaderCell>Type</ListTableHeaderCell>
                      <ListTableHeaderCell>Requester</ListTableHeaderCell>
                      <ListTableHeaderCell>Submitted</ListTableHeaderCell>
                      <ListTableHeaderCell>Status</ListTableHeaderCell>
                      <ListTableHeaderCell className="text-right px-6">Actions</ListTableHeaderCell>
                    </ListTableHeaderRow>
                  </ListTableHead>
                  <ListTableBody>
                    {requests.map((req) => (
                      <ListTableRow
                        key={req.id}
                        className="cursor-pointer"
                        onClick={() => openInspectRequest(req)}
                      >
                        <ListTableCell className="px-6">
                          <p className="font-heading font-semibold text-text">{req.title}</p>
                          {req.summary && (
                            <p className="mt-0.5 text-xs text-muted line-clamp-1">{req.summary}</p>
                          )}
                        </ListTableCell>
                        <ListTableCell>
                          <Badge
                            variant={
                              req.entity_type === 'form_submission' ? 'secondary' : 'outline'
                            }
                          >
                            {req.entity_type === 'form_submission' ? 'Form' : 'Long Leave'}
                          </Badge>
                        </ListTableCell>
                        <ListTableCell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={req.requester_name}
                              avatarObjectKey={req.requester_avatar_object_key}
                              size="sm"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-text truncate">{req.requester_name}</p>
                              {req.requester_email && (
                                <p className="text-xs text-muted truncate">{req.requester_email}</p>
                              )}
                            </div>
                          </div>
                        </ListTableCell>
                        <ListTableCell>
                          <span className="text-sm text-text">
                            {formatDateOnly(req.created_at)}
                          </span>
                        </ListTableCell>
                        <ListTableCell>
                          <Badge
                            variant={
                              req.status === 'approved'
                                ? 'default'
                                : req.status === 'rejected'
                                  ? 'destructive'
                                  : 'accent'
                            }
                          >
                            {req.status}
                          </Badge>
                          {req.assigned_to_email && (
                            <p
                              className="mt-1 text-[11px] text-muted truncate max-w-[130px]"
                              title={req.assigned_to_email}
                            >
                              {req.assigned_to_email}
                            </p>
                          )}
                        </ListTableCell>
                        <ListTableCell
                          className="text-right px-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="sm"
                            variant={req.status === 'pending' ? 'default' : 'outline'}
                            onClick={() => openInspectRequest(req)}
                          >
                            {req.status === 'pending' ? 'Review & Decide' : 'Details'}
                          </Button>
                        </ListTableCell>
                      </ListTableRow>
                    ))}
                  </ListTableBody>
                </ListTable>
              </div>
            )}
          </div>
        )}
      </AdminPageShell.Content>

      {/* Review & Decide Modal */}
      <Dialog isOpen={Boolean(inspectingRequest)} onClose={closeInspectRequest} size="lg">
        <Dialog.Header>
          <div className="flex items-center gap-2">
            <Dialog.Title className="flex items-center gap-2.5 text-lg font-heading font-bold text-text">
              {inspectingRequest?.title}
              <Badge
                variant={
                  inspectingRequest?.status === 'approved'
                    ? 'default'
                    : inspectingRequest?.status === 'rejected'
                      ? 'destructive'
                      : 'accent'
                }
              >
                {inspectingRequest?.status}
              </Badge>
            </Dialog.Title>
          </div>
          <Dialog.Description className="text-xs text-muted">
            Review request details and apply administrative decisions.
          </Dialog.Description>
        </Dialog.Header>

        <Dialog.Body className="space-y-4 py-3">
          {/* Requester Profile with Avatar */}
          {inspectingRequest && (
            <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-background p-3.5 shadow-xs">
              <Avatar
                name={inspectingRequest.requester_name}
                avatarObjectKey={inspectingRequest.requester_avatar_object_key}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                  Requester
                </span>
                <p className="font-heading font-bold text-text text-base truncate">
                  {inspectingRequest.requester_name}
                </p>
                {inspectingRequest.requester_email && (
                  <p className="text-xs text-muted truncate">{inspectingRequest.requester_email}</p>
                )}
              </div>
            </div>
          )}

          {/* Reviewer Assignment & Delegation (Pending Only) */}
          {inspectingRequest?.status === 'pending' && (
            <div className="rounded-2xl border border-border bg-background p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
                    Reviewer Assignment
                  </span>
                  <p className="text-sm font-medium text-text mt-0.5">
                    {inspectingRequest.assigned_to_email ? (
                      <>
                        Assigned to{' '}
                        <span className="font-semibold text-primary">
                          {slodUsers.find(
                            (u) =>
                              u.email.toLowerCase() ===
                              inspectingRequest.assigned_to_email?.toLowerCase(),
                          )?.name || inspectingRequest.assigned_to_email}
                        </span>{' '}
                        ({inspectingRequest.assigned_to_email})
                      </>
                    ) : (
                      'Unassigned (Open to all Admins)'
                    )}
                  </p>
                </div>
                <Badge variant={inspectingRequest.assigned_to_email ? 'secondary' : 'outline'}>
                  {inspectingRequest.assigned_to_email ? 'Delegated' : 'Unassigned'}
                </Badge>
              </div>

              {/* Delegation Controls */}
              <div className="pt-2 border-t border-border">
                <div className="text-xs font-semibold text-text mb-1.5 flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  Delegate Review to SLOD
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <FormSelectField
                      id="delegate-slod-select"
                      ariaLabel="Select SLOD Reviewer"
                      value={delegatedEmail}
                      onChange={(val) => setDelegatedEmail(val)}
                      disabled={isDelegating || isLoadingSlod}
                      options={[
                        { value: '', label: 'Select SLOD reviewer...' },
                        ...slodUsers.map((u) => ({
                          value: u.email,
                          label: `${u.name} (${u.email})`,
                        })),
                      ]}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={
                      !delegatedEmail ||
                      delegatedEmail === inspectingRequest.assigned_to_email ||
                      isDelegating
                    }
                    onClick={handleDelegate}
                    className="shrink-0"
                  >
                    {isDelegating ? 'Delegating...' : 'Assign & Notify'}
                  </Button>
                </div>
                <p className="text-[11px] text-muted mt-1.5">
                  Delegating will send an approval review link to the SLOD. You can still approve
                  directly at any time.
                </p>
              </div>
            </div>
          )}

          {/* Metadata overview */}
          {inspectingRequest?.metadata &&
            (() => {
              const displayEntries = Object.entries(inspectingRequest.metadata).filter(
                ([key, val]) =>
                  ![
                    'form_field_id',
                    'field_key',
                    'access_token',
                    'token_expires_at',
                    'token',
                  ].includes(key) &&
                  val != null &&
                  val !== '',
              );
              if (displayEntries.length === 0) return null;
              return (
                <div className="rounded-xl border border-border bg-background p-4 text-xs">
                  <div className="font-heading font-semibold text-text mb-2">Request Details</div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                    {displayEntries.map(([key, val]) => (
                      <div key={key}>
                        <dt className="text-muted capitalize">{key.replace(/_/g, ' ')}</dt>
                        <dd className="font-medium text-text mt-0.5">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })()}

          {/* Decision Record */}
          {inspectingRequest?.status !== 'pending' && (
            <div className="rounded-xl border border-border bg-surface p-4 text-xs">
              <div className="font-heading font-semibold text-text">Decision Record</div>
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

          {/* Decision Notes Input */}
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
                className="block w-full rounded-xl border border-border bg-surface p-3 text-sm text-text placeholder:text-muted shadow-xs focus:border-primary focus:outline-hidden"
              />
            </div>
          )}
        </Dialog.Body>

        <Dialog.Footer className="flex-col-reverse gap-2 sm:flex-row sm:justify-end border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={closeInspectRequest}
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
                <XCircle className="mr-1.5 h-4 w-4" />
                Decline
              </Button>

              <Button
                type="button"
                variant="default"
                disabled={isSubmitting}
                onClick={() => handleDecision('approved')}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
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
