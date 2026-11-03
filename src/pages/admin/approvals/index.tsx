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

type EndorsementQuestionDef = {
  key: string;
  label: string;
  type?: 'rating' | 'badge' | 'text' | 'textarea' | 'list';
};

type EndorsementGroupDef = {
  id: string;
  title: string;
  description?: string;
  questions: EndorsementQuestionDef[];
};

const RATING_SCORE_DESCRIPTIONS: Record<number, string> = {
  1: 'Not Observed',
  2: 'Observed Some of the time',
  3: 'Observed Most of the time',
};

const ENDORSEMENT_GROUPS: EndorsementGroupDef[] = [
  {
    id: 'dgroup_relationship',
    title: '1. Leader & DGroup Relationship',
    description: 'Disciple-maker relationship and involvement in the DGroup.',
    questions: [
      { key: 'leader_full_name', label: 'Leader Full Name', type: 'text' },
      { key: 'disciple_dgroup_since', label: 'Started in DGroup Since', type: 'text' },
      { key: 'is_disciple_dgroup_leader', label: 'Already a DGroup Leader?', type: 'badge' },
      { key: 'disciple_led_dgroup_since', label: 'Started Leading Own DGroup Since', type: 'text' },
    ],
  },
  {
    id: 'spiritual_character',
    title: '2. Spiritual Maturity & Character Evaluation',
    description:
      'Score Scale: 1 = Not Observed · 2 = Observed Some of the time · 3 = Observed Most of the time',
    questions: [
      {
        key: 'eval_prayer_and_devotion',
        label: 'Consistent prayer time, personal devotion and study of God’s word',
        type: 'rating',
      },
      {
        key: 'eval_private_life_in_order',
        label: 'Private life is in order (free from addictions, uses resources wisely)',
        type: 'rating',
      },
      {
        key: 'eval_scripture_priorities',
        label: 'Makes decisions and sets priorities based on Scripture',
        type: 'rating',
      },
      { key: 'eval_shares_gospel', label: 'Shares the gospel consistently', type: 'rating' },
      {
        key: 'eval_submits_to_authority',
        label: 'Submits to God-given authorities',
        type: 'rating',
      },
      {
        key: 'eval_listens_to_counsel',
        label: 'Listens to corrections and counsel',
        type: 'rating',
      },
      {
        key: 'eval_treats_people_with_respect',
        label: 'Treats difficult people with respect and dignity',
        type: 'rating',
      },
      {
        key: 'eval_no_gossip',
        label: 'Does not criticize, judge, badmouth, or gossip',
        type: 'rating',
      },
      {
        key: 'eval_consistent_small_group',
        label: 'Consistently leads and/or attends a small group',
        type: 'rating',
      },
      {
        key: 'eval_serves_others',
        label: 'Serves others even when inconvenient',
        type: 'rating',
      },
      {
        key: 'eval_family_relationships',
        label: 'Maintains good family relationships',
        type: 'rating',
      },
      {
        key: 'eval_quality_family_time',
        label: 'Spends quality time with family',
        type: 'rating',
      },
    ],
  },
  {
    id: 'growth_assessment',
    title: '3. Disciple Growth & Assessment',
    description: 'Observed strengths, weaknesses, and growth opportunities.',
    questions: [
      { key: 'disciple_strengths', label: 'Observed Strengths', type: 'textarea' },
      { key: 'disciple_weaknesses', label: 'Observed Weaknesses', type: 'textarea' },
      { key: 'disciple_improvements', label: 'Areas for Improvement', type: 'textarea' },
    ],
  },
  {
    id: 'credibility_concerns',
    title: '4. Ministry Credibility & Concerns',
    description: 'Potential concerns regarding ministry effectiveness and credibility.',
    questions: [
      { key: 'credibility_concerns', label: 'Disclosed Concerns', type: 'list' },
      { key: 'credibility_concerns_details', label: 'Concern Details', type: 'textarea' },
    ],
  },
  {
    id: 'recommendation_attestation',
    title: '5. Attestation & Recommendation',
    description: 'Formal ministry recommendation and leader attestation commitment.',
    questions: [
      { key: 'recommendation_decision', label: 'Ministry Recommendation', type: 'badge' },
      { key: 'recommendation_comments', label: 'Recommendation Comments', type: 'textarea' },
      {
        key: 'leader_attestation_statement',
        label: 'Leader Attestation Commitment',
        type: 'badge',
      },
      { key: 'attestation_comments', label: 'Attestation Comments', type: 'textarea' },
    ],
  },
];

function renderEndorsementAnswerValue(item: EndorsementQuestionDef, value: unknown) {
  if (value === undefined || value === null || value === '') {
    return <span className="italic text-muted">—</span>;
  }

  if (item.type === 'rating') {
    const score = Number(value);
    const desc = RATING_SCORE_DESCRIPTIONS[score];
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/10 px-1.5 text-xs font-bold text-primary">
          {score || String(value)}
        </span>
        {desc && <span className="text-xs text-muted">({desc})</span>}
      </div>
    );
  }

  if (item.type === 'badge') {
    const strVal = String(value);
    const isAttested = strVal === 'I attest' || strVal === 'Yes';
    const isDeclined = strVal === 'I DO NOT attest' || strVal.startsWith('No');
    const isReservation = strVal.includes('reservations');
    const variant = isAttested
      ? 'default'
      : isDeclined
        ? 'destructive'
        : isReservation
          ? 'accent'
          : 'outline';
    return <Badge variant={variant}>{strVal}</Badge>;
  }

  if (item.type === 'list') {
    if (Array.isArray(value) && value.length > 0) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {String(v)}
            </Badge>
          ))}
        </div>
      );
    }
    return <span className="italic text-muted">{String(value || 'None reported')}</span>;
  }

  if (item.type === 'textarea') {
    return (
      <p className="whitespace-pre-wrap rounded-lg border border-border/60 bg-background p-2.5 text-xs text-text">
        {String(value)}
      </p>
    );
  }

  return <span className="font-semibold text-text">{String(value)}</span>;
}

function getApprovalEntityTypeLabel(entityType: ApprovalEntityType, isMobile = false): string {
  switch (entityType) {
    case 'form_submission':
      return isMobile ? 'Form Registration' : 'Form';
    case 'recruitment_endorsement':
      return 'Endorsement';
    case 'service_excuse':
    default:
      return 'Long Leave';
  }
}

function getApprovalEntityTypeBadgeVariant(
  entityType: ApprovalEntityType,
): 'secondary' | 'outline' {
  switch (entityType) {
    case 'form_submission':
      return 'secondary';
    case 'recruitment_endorsement':
    case 'service_excuse':
    default:
      return 'outline';
  }
}

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
                  { value: 'recruitment_endorsement', label: 'Endorsements' },
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
                              variant={getApprovalEntityTypeBadgeVariant(req.entity_type)}
                              className="mb-1.5"
                            >
                              {getApprovalEntityTypeLabel(req.entity_type, true)}
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
                          <Badge variant={getApprovalEntityTypeBadgeVariant(req.entity_type)}>
                            {getApprovalEntityTypeLabel(req.entity_type, false)}
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
      <Dialog isOpen={Boolean(inspectingRequest)} onClose={closeInspectRequest} size="4xl">
        <Dialog.Header>
          <div className="flex items-center gap-2">
            <Dialog.Title className="flex flex-wrap items-center gap-2.5 text-lg font-heading font-bold text-text">
              {inspectingRequest?.title}
              {inspectingRequest && (
                <Badge variant={getApprovalEntityTypeBadgeVariant(inspectingRequest.entity_type)}>
                  {getApprovalEntityTypeLabel(inspectingRequest.entity_type)}
                </Badge>
              )}
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
              const isEndorsement = inspectingRequest.entity_type === 'recruitment_endorsement';
              const displayEntries = Object.entries(inspectingRequest.metadata).filter(
                ([key, val]) =>
                  ![
                    'form_field_id',
                    'field_key',
                    'access_token',
                    'token_expires_at',
                    'token',
                    ...(isEndorsement ? ['attestation_answers'] : []),
                  ].includes(key) &&
                  val != null &&
                  val !== '',
              );
              if (displayEntries.length === 0) return null;
              return (
                <div className="rounded-xl border border-border bg-background p-4 text-xs">
                  <div className="font-heading font-semibold text-text mb-2">Request Details</div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                    {displayEntries.map(([key, val]) => {
                      const isComplex = typeof val === 'object' && val !== null;
                      return (
                        <div key={key} className={isComplex ? 'col-span-full' : 'min-w-0'}>
                          <dt className="text-muted capitalize">{key.replace(/_/g, ' ')}</dt>
                          <dd className="font-medium text-text mt-0.5 min-w-0 break-words">
                            {isComplex ? (
                              <div className="mt-1 space-y-1.5 rounded-lg border border-border bg-surface p-2.5 text-xs">
                                {Object.entries(val as Record<string, unknown>).map(
                                  ([subKey, subVal]) => (
                                    <div
                                      key={subKey}
                                      className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 border-b border-border/50 pb-1.5 last:border-b-0 last:pb-0"
                                    >
                                      <span className="text-muted capitalize shrink-0">
                                        {subKey.replace(/_/g, ' ')}:
                                      </span>
                                      <span className="font-semibold text-text break-words sm:text-right">
                                        {typeof subVal === 'object'
                                          ? JSON.stringify(subVal)
                                          : String(subVal ?? '—')}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="break-all">{String(val)}</span>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              );
            })()}

          {/* Endorsement Questionnaire Results Grouped by Approval Sequence */}
          {inspectingRequest?.entity_type === 'recruitment_endorsement' && attestationAnswers && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2 pt-1">
                <div>
                  <h4 className="font-heading text-sm font-bold text-text">
                    DGroup Leader Endorsement Questionnaire
                  </h4>
                  <p className="text-xs text-muted">
                    Observations submitted by the DGroup Leader grouped by the endorsement sequence.
                  </p>
                </div>
                <Badge variant="outline">5 Sections</Badge>
              </div>

              {ENDORSEMENT_GROUPS.map((group) => {
                const groupEntries = group.questions
                  .map((q) => ({ ...q, value: attestationAnswers[q.key] }))
                  .filter((q) => q.value !== undefined && q.value !== null && q.value !== '');

                if (groupEntries.length === 0) return null;

                return (
                  <div
                    key={group.id}
                    className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3"
                  >
                    <div>
                      <h5 className="font-heading text-sm font-semibold text-text">
                        {group.title}
                      </h5>
                      {group.description && (
                        <p className="mt-0.5 text-xs text-muted">{group.description}</p>
                      )}
                    </div>

                    <div className="divide-y divide-border/60">
                      {groupEntries.map((item) => (
                        <div key={item.key} className="py-2.5 first:pt-0 last:pb-0">
                          {item.type === 'textarea' ? (
                            <div className="space-y-1">
                              <span className="text-xs font-medium text-muted">{item.label}</span>
                              {renderEndorsementAnswerValue(item, item.value)}
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                              <span className="text-xs font-medium text-muted sm:max-w-[65%]">
                                {item.label}
                              </span>
                              <div className="sm:text-right">
                                {renderEndorsementAnswerValue(item, item.value)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Fallback for any unmapped answers */}
              {(() => {
                const mappedKeys = new Set(
                  ENDORSEMENT_GROUPS.flatMap((g) => g.questions.map((q) => q.key)),
                );
                const extraEntries = Object.entries(attestationAnswers).filter(
                  ([k, v]) => !mappedKeys.has(k) && v != null && v !== '',
                );
                if (extraEntries.length === 0) return null;
                return (
                  <div className="rounded-xl border border-border bg-surface p-4 shadow-2xs space-y-3">
                    <h5 className="font-heading text-sm font-semibold text-text">
                      Additional Observations
                    </h5>
                    <div className="divide-y divide-border/60">
                      {extraEntries.map(([k, v]) => (
                        <div
                          key={k}
                          className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5"
                        >
                          <span className="text-xs font-medium text-muted capitalize">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs font-semibold text-text sm:text-right break-words">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

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
