import { useRef, useState } from 'react';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Avatar,
  Badge,
  Button,
  FormTextareaField,
  SectionCard,
  Skeleton,
  StepIndicator,
  WizardStep,
} from '@/components/ui';
import {
  useApprovalReviewQuery,
  useSubmitApprovalDecisionMutation,
} from '@/hooks/domain/approvals';
import { useWizardStepScroll } from '@/hooks/utils';

import { RecruitmentEndorsementReviewSection } from './components/RecruitmentEndorsementReviewSection';

export function ApprovalReviewPage() {
  const { token } = useParams<{ token: string }>();
  const [activeStep, setActiveStep] = useState<number>(1);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | null>(null);

  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);
  useWizardStepScroll(activeStep, [stepOneRef, stepTwoRef]);

  const { data: reviewData, isLoading, isError, error, refetch } = useApprovalReviewQuery(token);
  const { mutate: submitDecision, isPending: isSubmitting } = useSubmitApprovalDecisionMutation();

  const handleDecision = (
    decision: 'approved' | 'rejected',
    attestationAnswers?: Record<string, unknown>,
  ) => {
    if (!token) return;

    if (decision === 'rejected' && !decisionNotes.trim()) {
      toast.error('Please provide a reason or note when declining a request.');
      return;
    }

    setSelectedAction(decision);
    submitDecision(
      {
        token,
        decision,
        notes: decisionNotes.trim() || null,
        attestation_answers: attestationAnswers,
      },
      {
        onSuccess: (data) => {
          toast.success(data.message || `Request ${decision} successfully`);
          refetch();
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to submit decision');
          setSelectedAction(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !reviewData?.approval) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-text">
          Invalid or Expired Link
        </h1>
        <p className="mt-2 text-sm text-muted">
          {error?.message ||
            'This approval link is invalid, has expired, or the request no longer exists.'}
        </p>
      </div>
    );
  }

  const { approval, entity_details } = reviewData;
  const isPending = approval.status === 'pending' && !approval.is_expired;

  const excuseStartDate = String(
    (entity_details as { start_date?: string })?.start_date ||
      (approval.metadata as { start_date?: string })?.start_date ||
      '—',
  );
  const excuseEndDate = String(
    (entity_details as { end_date?: string })?.end_date ||
      (approval.metadata as { end_date?: string })?.end_date ||
      '—',
  );
  const excuseReason = String(
    (entity_details as { reason?: string })?.reason ||
      (approval.metadata as { reason?: string })?.reason ||
      'No reason provided.',
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Banner / Request Identification */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                approval.status === 'approved'
                  ? 'border border-emerald-200 bg-emerald-100 text-emerald-800'
                  : approval.status === 'rejected'
                    ? 'border border-rose-200 bg-rose-100 text-rose-800'
                    : approval.is_expired
                      ? 'border border-slate-200 bg-slate-100 text-slate-800'
                      : 'border border-amber-200 bg-amber-100 text-amber-800'
              }`}
            >
              {approval.status === 'approved' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {approval.status === 'rejected' && <XCircle className="h-3.5 w-3.5" />}
              {approval.status === 'pending' && !approval.is_expired && (
                <Clock className="h-3.5 w-3.5" />
              )}
              {approval.is_expired ? 'Expired' : approval.status}
            </span>
            <span className="text-xs text-muted">
              {approval.entity_type === 'form_submission'
                ? 'Form Registration'
                : approval.entity_type === 'service_excuse'
                  ? 'Long Leave Request'
                  : 'DGroup Leader Endorsement'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">{approval.title}</h1>
        </div>

        <div className="text-sm text-muted sm:text-right">
          <div>Submitted on</div>
          <div className="font-semibold text-text">
            {new Date(approval.created_at).toLocaleDateString(undefined, {
              dateStyle: 'medium',
            })}
          </div>
        </div>
      </div>

      {/* Outcome Summary Banner if decided or expired */}
      {approval.status !== 'pending' && (
        <div
          className={`rounded-2xl border p-5 ${
            approval.status === 'approved'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
              : 'border-rose-200 bg-rose-50/70 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-3.5">
            {approval.status === 'approved' ? (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="font-heading text-base font-semibold">
                This request was {approval.status}
                {approval.decided_by_email && ` by ${approval.decided_by_email}`}
                {approval.decided_at &&
                  ` on ${new Date(approval.decided_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}`}
              </p>
              {approval.decision_notes && (
                <p className="mt-1.5 text-sm opacity-90">
                  <span className="font-medium">Note:</span> {approval.decision_notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {approval.status === 'pending' && approval.is_expired && (
        <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" />
          <p className="text-sm">
            This review link expired on {new Date(approval.token_expires_at).toLocaleDateString()}.
            Please contact an administrator if action is still required.
          </p>
        </div>
      )}

      {/* Entity-specific flows */}
      {approval.entity_type === 'recruitment_endorsement' && entity_details && (
        <RecruitmentEndorsementReviewSection
          entityDetails={entity_details}
          canDecide={isPending}
          isSubmitting={isSubmitting}
          decisionNotes={decisionNotes}
          onDecisionNotesChange={(event) => setDecisionNotes(event.target.value)}
          onDecision={handleDecision}
        />
      )}

      {approval.entity_type !== 'recruitment_endorsement' && (
        <>
          {isPending ? (
            <div className="space-y-6">
              <StepIndicator
                currentStep={activeStep}
                totalSteps={2}
                labels={['Request Details', 'Decision & Notes']}
                categoryLabel="Approval Review"
              />

              {activeStep === 1 && (
                <WizardStep
                  title="Request Details"
                  subtitle="Review the requester information and submission details below."
                >
                  <div ref={stepOneRef} className="space-y-6">
                    <SectionCard title="Requester Details">
                      <div className="flex items-center gap-3.5">
                        <Avatar
                          name={approval.requester_name}
                          avatarObjectKey={approval.requester_avatar_object_key}
                          size="md"
                        />
                        <div className="min-w-0">
                          <div className="font-heading text-lg font-bold text-text">
                            {approval.requester_name}
                          </div>
                          {approval.requester_email && (
                            <div className="text-sm text-muted">{approval.requester_email}</div>
                          )}
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title={
                        approval.entity_type === 'form_submission'
                          ? 'Submission Responses'
                          : 'Leave Schedule & Reason'
                      }
                    >
                      {approval.entity_type === 'form_submission' && entity_details && (
                        <div className="divide-y divide-border">
                          {Array.isArray(
                            (entity_details as { form_submission_answers?: unknown[] })
                              .form_submission_answers,
                          ) &&
                          (
                            entity_details as {
                              form_submission_answers: Array<{
                                id: string;
                                answer_text: string | null;
                                form_fields?: { label: string; field_type: string };
                              }>;
                            }
                          ).form_submission_answers.length > 0 ? (
                            (
                              entity_details as {
                                form_submission_answers: Array<{
                                  id: string;
                                  answer_text: string | null;
                                  form_fields?: { label: string; field_type: string };
                                }>;
                              }
                            ).form_submission_answers.map((answer) => {
                              const isApproval =
                                answer.form_fields?.field_type === 'required_approval';
                              return (
                                <div key={answer.id} className="py-3 first:pt-0 last:pb-0">
                                  <div className="text-xs font-medium text-muted">
                                    {answer.form_fields?.label || 'Field'}
                                  </div>
                                  {isApproval ? (
                                    <div className="mt-1 flex items-center gap-2">
                                      {answer.answer_text === 'approved' ? (
                                        <Badge variant="default">Approved</Badge>
                                      ) : answer.answer_text === 'rejected' ||
                                        answer.answer_text === 'declined' ? (
                                        <Badge variant="destructive">Declined</Badge>
                                      ) : (
                                        <Badge variant="secondary">Pending Review</Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="mt-0.5 text-sm font-medium text-text">
                                      {answer.answer_text || '—'}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="py-3 text-sm italic text-muted">
                              No field answers recorded.
                            </p>
                          )}
                        </div>
                      )}

                      {approval.entity_type === 'service_excuse' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <div className="text-xs text-muted">Leave Period</div>
                              <div className="mt-0.5 text-sm font-semibold text-text">
                                {excuseStartDate} to {excuseEndDate}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted">Excused Commitments</div>
                              <div className="mt-0.5 text-sm font-semibold text-text">
                                All Sunday Service Commitments
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="text-xs text-muted">Reason for Leave</div>
                            <div className="mt-1 rounded-xl border border-border bg-background p-3 text-sm text-text">
                              {excuseReason}
                            </div>
                          </div>
                        </div>
                      )}
                    </SectionCard>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => setActiveStep(2)}
                        className="w-full sm:w-auto"
                      >
                        Continue to Decision <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </WizardStep>
              )}

              {activeStep === 2 && (
                <WizardStep
                  title="Decision & Notes"
                  subtitle="Provide your review notes and submit your approval decision."
                >
                  <div ref={stepTwoRef} className="space-y-6">
                    <SectionCard title="Request Summary">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-muted">Requester</div>
                          <div className="text-sm font-semibold text-text">
                            {approval.requester_name}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted">Request Type</div>
                          <div className="text-sm font-semibold text-text">
                            {approval.entity_type === 'form_submission'
                              ? 'Form Submission'
                              : 'Service Excuse'}
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
                      title="Reviewer Notes"
                      subtitle="Optional for approval, required if declining."
                    >
                      <FormTextareaField
                        id="decision-notes"
                        label="Notes / Feedback for Applicant"
                        value={decisionNotes}
                        onChange={(e) => setDecisionNotes(e.target.value)}
                        rows={3}
                        textareaClassName="resize-none"
                        placeholder="e.g. Approved. Thank you for your commitment to our community."
                        helperText="A note is required when declining a request."
                        disabled={isSubmitting}
                      />
                    </SectionCard>

                    <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        onClick={() => setActiveStep(1)}
                        className="w-full sm:w-auto"
                      >
                        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Details
                      </Button>
                      <div className="flex flex-col-reverse gap-3 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isSubmitting}
                          onClick={() => handleDecision('rejected')}
                          className="w-full sm:w-auto border-rose-300 text-rose-700 hover:bg-rose-50"
                        >
                          <XCircle className="mr-1.5 h-4 w-4" />
                          {isSubmitting && selectedAction === 'rejected'
                            ? 'Declining...'
                            : 'Decline Request'}
                        </Button>
                        <Button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleDecision('approved')}
                          className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          {isSubmitting && selectedAction === 'approved'
                            ? 'Approving...'
                            : 'Approve Request'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </WizardStep>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <SectionCard title="Requester Details">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    name={approval.requester_name}
                    avatarObjectKey={approval.requester_avatar_object_key}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="font-heading text-lg font-bold text-text">
                      {approval.requester_name}
                    </div>
                    {approval.requester_email && (
                      <div className="text-sm text-muted">{approval.requester_email}</div>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title={
                  approval.entity_type === 'form_submission'
                    ? 'Submission Responses'
                    : 'Leave Schedule & Reason'
                }
              >
                {approval.entity_type === 'form_submission' && entity_details && (
                  <div className="divide-y divide-border">
                    {Array.isArray(
                      (entity_details as { form_submission_answers?: unknown[] })
                        .form_submission_answers,
                    ) &&
                    (
                      entity_details as {
                        form_submission_answers: Array<{
                          id: string;
                          answer_text: string | null;
                          form_fields?: { label: string; field_type: string };
                        }>;
                      }
                    ).form_submission_answers.length > 0 ? (
                      (
                        entity_details as {
                          form_submission_answers: Array<{
                            id: string;
                            answer_text: string | null;
                            form_fields?: { label: string; field_type: string };
                          }>;
                        }
                      ).form_submission_answers.map((answer) => {
                        const isApproval = answer.form_fields?.field_type === 'required_approval';
                        return (
                          <div key={answer.id} className="py-3 first:pt-0 last:pb-0">
                            <div className="text-xs font-medium text-muted">
                              {answer.form_fields?.label || 'Field'}
                            </div>
                            {isApproval ? (
                              <div className="mt-1 flex items-center gap-2">
                                {answer.answer_text === 'approved' ? (
                                  <Badge variant="default">Approved</Badge>
                                ) : answer.answer_text === 'rejected' ||
                                  answer.answer_text === 'declined' ? (
                                  <Badge variant="destructive">Declined</Badge>
                                ) : (
                                  <Badge variant="secondary">Pending Review</Badge>
                                )}
                              </div>
                            ) : (
                              <div className="mt-0.5 text-sm font-medium text-text">
                                {answer.answer_text || '—'}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <p className="py-3 text-sm italic text-muted">No field answers recorded.</p>
                    )}
                  </div>
                )}

                {approval.entity_type === 'service_excuse' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted">Leave Period</div>
                        <div className="mt-0.5 text-sm font-semibold text-text">
                          {excuseStartDate} to {excuseEndDate}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted">Excused Commitments</div>
                        <div className="mt-0.5 text-sm font-semibold text-text">
                          All Sunday Service Commitments
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted">Reason for Leave</div>
                      <div className="mt-1 rounded-xl border border-border bg-background p-3 text-sm text-text">
                        {excuseReason}
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ApprovalReviewPage;
