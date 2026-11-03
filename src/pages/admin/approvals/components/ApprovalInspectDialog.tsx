import { CheckCircle2, XCircle } from 'lucide-react';

import { Avatar, Badge, Button, Dialog } from '@/components/ui';
import type { ApprovalRequest, SlodUserItem } from '@/lib/domain/approvals';

import { ApprovalReviewerDelegationSection } from './ApprovalReviewerDelegationSection';
import { FormRegistrationInspectSection } from './FormRegistrationInspectSection';
import { LongLeaveInspectSection } from './LongLeaveInspectSection';
import { RecruitmentEndorsementInspectSection } from './RecruitmentEndorsementInspectSection';
import { getApprovalEntityTypeBadgeVariant, getApprovalEntityTypeLabel } from './helpers';

export interface ApprovalInspectDialogProps {
  request: ApprovalRequest | null;
  onClose: () => void;
  slodUsers: SlodUserItem[];
  isLoadingSlod: boolean;
  delegatedEmail: string;
  onDelegatedEmailChange: (val: string) => void;
  onDelegate: () => void;
  isDelegating: boolean;
  decisionNotes: string;
  onDecisionNotesChange: (val: string) => void;
  onDecision: (decision: 'approved' | 'rejected') => void;
  isSubmitting: boolean;
  attestationAnswers: Record<string, unknown> | null;
}

export function ApprovalInspectDialog({
  request,
  onClose,
  slodUsers,
  isLoadingSlod,
  delegatedEmail,
  onDelegatedEmailChange,
  onDelegate,
  isDelegating,
  decisionNotes,
  onDecisionNotesChange,
  onDecision,
  isSubmitting,
  attestationAnswers,
}: ApprovalInspectDialogProps) {
  if (!request) return null;

  const isPending = request.status === 'pending';

  return (
    <Dialog isOpen={Boolean(request)} onClose={onClose} size="4xl">
      <Dialog.Header>
        <div className="flex items-center gap-2">
          <Dialog.Title className="flex flex-wrap items-center gap-2.5 text-lg font-heading font-bold text-text">
            {request.title}
            <Badge variant={getApprovalEntityTypeBadgeVariant(request.entity_type)}>
              {getApprovalEntityTypeLabel(request.entity_type)}
            </Badge>
            <Badge
              variant={
                request.status === 'approved'
                  ? 'default'
                  : request.status === 'rejected'
                    ? 'destructive'
                    : 'accent'
              }
            >
              {request.status}
            </Badge>
          </Dialog.Title>
        </div>
        <Dialog.Description className="text-xs text-muted">
          Review request details and apply administrative decisions.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="space-y-4 py-3">
        {/* Requester Profile with Avatar */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-background p-3.5 shadow-xs">
          <Avatar
            name={request.requester_name}
            avatarObjectKey={request.requester_avatar_object_key}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted block">
              Requester
            </span>
            <p className="font-heading font-bold text-text text-base truncate">
              {request.requester_name}
            </p>
            {request.requester_email && (
              <p className="text-xs text-muted truncate">{request.requester_email}</p>
            )}
          </div>
        </div>

        {/* Reviewer Assignment & Delegation (Pending Only) */}
        {isPending && (
          <ApprovalReviewerDelegationSection
            request={request}
            slodUsers={slodUsers}
            delegatedEmail={delegatedEmail}
            onDelegatedEmailChange={onDelegatedEmailChange}
            onDelegate={onDelegate}
            isDelegating={isDelegating}
            isLoadingSlod={isLoadingSlod}
          />
        )}

        {/* Long Leave Request Details Grouped by Category */}
        {request.entity_type === 'service_excuse' && <LongLeaveInspectSection request={request} />}

        {/* Form Registration Details Grouped by Category */}
        {request.entity_type === 'form_submission' && (
          <FormRegistrationInspectSection request={request} />
        )}

        {/* Generic Metadata overview (Endorsements Application ID & any unhandled entities) */}
        {request.metadata &&
          request.entity_type !== 'service_excuse' &&
          request.entity_type !== 'form_submission' &&
          (() => {
            const isEndorsement = request.entity_type === 'recruitment_endorsement';
            const displayEntries = Object.entries(request.metadata).filter(
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
                            Array.isArray(val) ? (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {val.map((item, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {String(item)}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
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
                            )
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
        {request.entity_type === 'recruitment_endorsement' && attestationAnswers && (
          <RecruitmentEndorsementInspectSection attestationAnswers={attestationAnswers} />
        )}

        {/* Decision Record */}
        {!isPending && (
          <div className="rounded-xl border border-border bg-surface p-4 text-xs">
            <div className="font-heading font-semibold text-text">Decision Record</div>
            <div className="mt-1 text-muted">
              Decided by {request.decided_by_email || 'Administrator'} on{' '}
              {request.decided_at && new Date(request.decided_at).toLocaleString()}
            </div>
            {request.decision_notes && (
              <div className="mt-2 text-text">
                <span className="font-semibold">Notes:</span> {request.decision_notes}
              </div>
            )}
          </div>
        )}

        {/* Decision Notes Input */}
        {isPending && (
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
              onChange={(e) => onDecisionNotesChange(e.target.value)}
              placeholder="Enter any guidance, conditional notes, or decline reason..."
              disabled={isSubmitting}
              className="block w-full rounded-xl border border-border bg-surface p-3 text-sm text-text placeholder:text-muted shadow-xs focus:border-primary focus:outline-hidden"
            />
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button
          type="button"
          variant={isPending ? 'outline' : 'primaryOutline'}
          disabled={isSubmitting}
          onClick={onClose}
        >
          Close
        </Button>

        {isPending && (
          <>
            <Button
              type="button"
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => onDecision('rejected')}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Decline
            </Button>

            <Button
              type="button"
              variant="default"
              disabled={isSubmitting}
              onClick={() => onDecision('approved')}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Approve Request
            </Button>
          </>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
