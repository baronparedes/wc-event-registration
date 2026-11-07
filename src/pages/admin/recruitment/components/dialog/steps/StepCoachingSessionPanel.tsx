import { useState } from 'react';

import { AlertCircle, CheckCircle2, Clock, RotateCcw } from 'lucide-react';

import {
  Badge,
  Button,
  FormErrorSummary,
  FormSelectField,
  SundayDateTimePicker,
} from '@/components/ui';
import { useFormErrorFocus } from '@/hooks/utils';
import {
  RECRUITMENT_ROLES,
  RECRUITMENT_STEPS,
  type RecruiterNote,
  type RecruitmentApplication,
  type RecruitmentPipelineTransaction,
  type ReviewerUserItem,
} from '@/lib/domain/recruitment';
import { formatDateTime, toDatetimeLocal } from '@/lib/infrastructure';

import { ReviewerUserPicker } from '../ReviewerUserPicker';
import { type ScheduleActionKind } from '../ScheduleSessionConfirmDialog';
import { StepRecruiterNotesThread } from '../StepRecruiterNotesThread';
import { CompletedStepCard } from './CompletedStepCard';
import { LockedStepCard } from './LockedStepCard';

interface StepCoachingSessionPanelProps {
  stepNumber: number;
  application: RecruitmentApplication;
  transactions: RecruitmentPipelineTransaction[];
  stepNotes: RecruiterNote[];
  isCompletedStep: boolean;
  isFutureStep: boolean;
  isPending: boolean;
  canOverrideGate: boolean;
  isDGroupEndorsed: boolean;
  onJumpToActive: () => void;
  onRequestSchedule: (options: {
    scheduledAt: string;
    reviewerId: string;
    reviewerName: string;
    selectedReviewerUser: ReviewerUserItem | null;
    actionKind: ScheduleActionKind;
  }) => void;
  onRequestComplete: (options: {
    confirmedRole?: string;
    scheduledAt?: string;
    reviewerId?: string;
    reviewerName?: string;
    selectedReviewerUser?: ReviewerUserItem | null;
  }) => void;
}

const roleOptions = RECRUITMENT_ROLES.map((role) => ({
  label: role,
  value: role,
}));

export function StepCoachingSessionPanel({
  stepNumber,
  application,
  transactions,
  stepNotes,
  isCompletedStep,
  isFutureStep,
  canOverrideGate,
  isDGroupEndorsed,
  isPending,
  onJumpToActive,
  onRequestSchedule,
  onRequestComplete,
}: StepCoachingSessionPanelProps) {
  const stepMeta = RECRUITMENT_STEPS.find((s) => s.stepNumber === stepNumber);

  const stepTransactions = [...transactions]
    .filter((t) => t.step_number === stepNumber)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latestStepTransaction = stepTransactions[0];
  const previousStepAttempts = stepTransactions.slice(1);

  const currentStepNotes = (stepNotes ?? []).filter((n) => n.step_number === stepNumber);
  const { focusFirstError } = useFormErrorFocus();

  const [reviewerId, setReviewerId] = useState<string>(
    latestStepTransaction?.assigned_reviewer_id ?? '',
  );
  const [reviewerName, setReviewerName] = useState<string>(
    latestStepTransaction?.assigned_reviewer_name ?? '',
  );
  const [selectedReviewerUser, setSelectedReviewerUser] = useState<ReviewerUserItem | null>(null);
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(
    toDatetimeLocal(latestStepTransaction?.completed_at ?? latestStepTransaction?.scheduled_at),
  );
  const [confirmedRole, setConfirmedRole] = useState<string>(
    application.confirmed_role ?? application.desired_role,
  );
  const [repeatActionKind, setRepeatActionKind] = useState<
    'repeat_step' | 'return_to_interview' | 'return_to_observation' | null
  >(null);

  if (isFutureStep) {
    return (
      <LockedStepCard
        stepNumber={stepNumber}
        currentStep={application.current_step}
        onJump={onJumpToActive}
      />
    );
  }

  const handleInitiateRepeat = (
    kind: 'repeat_step' | 'return_to_interview' | 'return_to_observation',
  ) => {
    setRepeatActionKind(kind);
    setReviewerId('');
    setReviewerName('');
    setSelectedReviewerUser(null);
    setScheduledAtLocal('');
  };

  const handleCancelRepeat = () => {
    setRepeatActionKind(null);
    setReviewerId(latestStepTransaction?.assigned_reviewer_id ?? '');
    setReviewerName(latestStepTransaction?.assigned_reviewer_name ?? '');
    setSelectedReviewerUser(null);
    setScheduledAtLocal(
      toDatetimeLocal(latestStepTransaction?.completed_at ?? latestStepTransaction?.scheduled_at),
    );
  };

  const hasAssignedReviewer = Boolean(reviewerId?.trim() || reviewerName?.trim());
  const hasScheduledAt = Boolean(scheduledAtLocal?.trim() || latestStepTransaction?.scheduled_at);
  const hasNotesOnRecord =
    currentStepNotes.length > 0 || Boolean(latestStepTransaction?.notes?.trim());

  const missingDetails: string[] = [];
  if (!hasAssignedReviewer) missingDetails.push('Assigned To');
  if (!hasScheduledAt) missingDetails.push('Session Date & Time');
  if (stepNumber === 2 && !confirmedRole) missingDetails.push('Confirmed Ministry Role');
  if (stepNumber === 4 && !isDGroupEndorsed && !canOverrideGate) {
    missingDetails.push('DGroup Leader Endorsement');
  }
  if (!hasNotesOnRecord) {
    missingDetails.push('Recruitment Notes / Feedback');
  }

  const canComplete = missingDetails.length === 0;

  return (
    <div className="space-y-4">
      {isCompletedStep && <CompletedStepCard stepNumber={stepNumber} />}

      {/* Step 4 DGroup Endorsement Gate Warning */}
      {!isCompletedStep && stepNumber === 4 && !isDGroupEndorsed && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-text space-y-1">
          <p className="font-semibold text-amber-700 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            DGroup Leader Endorsement Pending
          </p>
          <p className="text-muted text-[11px]">
            Pastoral / DGroup endorsement from{' '}
            <strong>{application.dgroup_info.leader_name}</strong> is required before observation.
            {!canOverrideGate && ' Completing this step is locked until endorsement is approved.'}
          </p>
        </div>
      )}

      {/* Previous attempts history for this step */}
      {previousStepAttempts.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5 text-primary" />
              <h4 className="font-semibold text-xs text-text">
                Previous {stepNumber === 2 ? 'Interview' : stepMeta?.shortLabel} Attempts (
                {previousStepAttempts.length})
              </h4>
            </div>
            <Badge variant="secondary" className="text-[10px]">
              Recorded History Intact
            </Badge>
          </div>

          <div className="space-y-2">
            {previousStepAttempts.map((tx) => (
              <div
                key={tx.id}
                className="rounded-lg border border-border/60 bg-surface p-2.5 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-semibold text-text">Attempt #{tx.attempt_number}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px] capitalize py-0 px-1.5">
                      {tx.status}
                    </Badge>
                    <span className="text-[10px] text-muted font-mono">
                      {formatDateTime(tx.completed_at || tx.created_at)}
                    </span>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-muted">
                  <div>
                    <span>Coach: </span>
                    <strong className="text-text">{tx.assigned_reviewer_name || 'None'}</strong>
                  </div>
                  <div>
                    <span>Session Date: </span>
                    <strong className="text-text">
                      {tx.scheduled_at ? formatDateTime(tx.scheduled_at) : 'N/A'}
                    </strong>
                  </div>
                </div>
                {tx.notes && (
                  <div className="mt-1 rounded-md bg-surface p-2 text-[11px] text-text border border-border/40">
                    <span className="font-medium text-muted block mb-0.5">Recruitment Notes:</span>
                    <p className="whitespace-pre-wrap">{tx.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session & Evaluation Details */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <h4 className="font-semibold text-xs text-text flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {isCompletedStep
              ? 'Recorded Session & Evaluation Details'
              : 'Session & Evaluation Details'}
            {latestStepTransaction?.attempt_number && latestStepTransaction.attempt_number > 1 && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium py-0 px-1.5 border-primary/40 text-primary"
              >
                Attempt #{latestStepTransaction.attempt_number}
              </Badge>
            )}
          </h4>
          {latestStepTransaction?.status && (
            <Badge
              variant={
                latestStepTransaction.status === 'completed'
                  ? 'default'
                  : latestStepTransaction.status === 'scheduled'
                    ? 'accent'
                    : 'secondary'
              }
              className="text-[10px] capitalize"
            >
              {latestStepTransaction.status}
            </Badge>
          )}
        </div>

        <div className="space-y-3.5">
          {repeatActionKind && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-xs">
              <div>
                <strong className="text-text font-semibold">
                  {repeatActionKind === 'return_to_interview'
                    ? 'Scheduling Return to Interview (Step 2)'
                    : repeatActionKind === 'return_to_observation'
                      ? 'Scheduling Return to Observation (Step 4)'
                      : `Scheduling Repeat Attempt #${(latestStepTransaction?.attempt_number ?? 1) + 1} (${stepMeta?.title ?? ''})`}
                </strong>
                <p className="text-muted text-[11px] mt-0.5">
                  Previous session details have been cleared. Select a coach and Sunday date & time
                  below.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleCancelRepeat}
                className="shrink-0"
              >
                Cancel Retake
              </Button>
            </div>
          )}

          <ReviewerUserPicker
            id="assignedReviewer"
            label="Assigned To"
            required={!isCompletedStep}
            disabled={isCompletedStep}
            value={reviewerId}
            reviewerName={reviewerName}
            onChange={(id, user) => {
              setReviewerId(id);
              setReviewerName(user?.name || user?.full_name || '');
              setSelectedReviewerUser(user ?? null);
            }}
          />

          <SundayDateTimePicker
            id="sessionDateTime"
            label={isCompletedStep ? 'Session / Completion Date & Time' : 'Session Date & Time'}
            required={!isCompletedStep}
            disabled={isCompletedStep}
            readOnly={isCompletedStep}
            value={scheduledAtLocal}
            onChange={(value) => setScheduledAtLocal(value)}
            maxPastDays={null}
          />

          {!isCompletedStep && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-surface p-3 text-xs">
              <div className="text-muted text-[11px] leading-relaxed">
                {repeatActionKind ? (
                  <span>
                    Assign a coach and select a Sunday date & time above to schedule this retake.
                  </span>
                ) : latestStepTransaction?.scheduled_at ? (
                  <span>
                    Session scheduled for{' '}
                    <strong className="text-text">
                      {formatDateTime(latestStepTransaction.scheduled_at)}
                    </strong>
                    . Pick a new Sunday date or coach above to reschedule.
                  </span>
                ) : (
                  <span>
                    Assign a coach and select a Sunday date & time above to schedule this session.
                  </span>
                )}
              </div>
              {repeatActionKind ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onRequestSchedule({
                      scheduledAt: scheduledAtLocal,
                      reviewerId,
                      reviewerName,
                      selectedReviewerUser,
                      actionKind: repeatActionKind,
                    })
                  }
                  disabled={isPending || !scheduledAtLocal || (!reviewerId && !reviewerName)}
                  className="w-full sm:w-auto shrink-0 font-medium"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  {repeatActionKind === 'return_to_interview'
                    ? 'Schedule Return to Step 2'
                    : repeatActionKind === 'return_to_observation'
                      ? 'Schedule Return to Step 4'
                      : `Schedule Repeat ${stepMeta?.title ?? 'Session'}`}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primaryOutline"
                  size="sm"
                  onClick={() =>
                    onRequestSchedule({
                      scheduledAt: scheduledAtLocal,
                      reviewerId,
                      reviewerName,
                      selectedReviewerUser,
                      actionKind: latestStepTransaction?.scheduled_at ? 'reschedule' : 'schedule',
                    })
                  }
                  disabled={isPending || !scheduledAtLocal || (!reviewerId && !reviewerName)}
                  className="w-full sm:w-auto shrink-0 font-medium"
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  {latestStepTransaction?.scheduled_at
                    ? 'Update Session Schedule'
                    : 'Save Schedule'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Step 2 Interview: Final Ministry Role Assignment */}
        {stepNumber === 2 && (
          <div className="border-t border-border/80 pt-3 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-semibold text-text">
                Confirmed Ministry Role{isCompletedStep ? '' : ' *'}
              </span>
              {!isCompletedStep && (
                <span className="text-[11px] text-muted">
                  Desired role from application:{' '}
                  <strong className="text-text">{application.desired_role}</strong>
                </span>
              )}
            </div>
            {isCompletedStep ? (
              <div>
                <Badge variant="default" className="font-semibold text-xs">
                  {application.confirmed_role || confirmedRole}
                </Badge>
              </div>
            ) : (
              <FormSelectField
                id="confirmedRole"
                placeholder=""
                value={confirmedRole}
                onChange={(val) => setConfirmedRole(val)}
                options={roleOptions}
                helperText="Finalized during Step 2 Interview. Once completed, this ministry role is locked for all subsequent pipeline steps."
              />
            )}
          </div>
        )}

        {/* Steps 3+: Show Read-Only Confirmed Role Badge */}
        {stepNumber > 2 && (
          <div className="flex items-center justify-between gap-2 border-t border-border/80 pt-2 text-xs">
            <span className="text-muted">Final Ministry Role:</span>
            <Badge variant="default" className="font-semibold text-xs">
              {application.confirmed_role || confirmedRole}
            </Badge>
          </div>
        )}

        {/* Recruiter Notes Thread */}
        <StepRecruiterNotesThread
          applicationId={application.id}
          stepNumber={stepNumber}
          stepTitle={stepMeta?.title ?? `Step ${stepNumber}`}
          notes={currentStepNotes}
          isCompletedStep={isCompletedStep}
        />
      </div>

      {/* Missing Details Checklist Notice */}
      {!isCompletedStep && !canComplete && (
        <FormErrorSummary
          errorCount={missingDetails.length}
          title={`Required before completing Step ${stepNumber}:`}
          onJumpToFirstError={() => {
            const firstMissing = missingDetails[0] ?? '';
            if (
              firstMissing.includes('Assigned') ||
              firstMissing.includes('Coach') ||
              firstMissing.includes('Reviewer')
            ) {
              focusFirstError(['assignedReviewer']);
            } else if (firstMissing.includes('Date')) {
              focusFirstError(['sessionDateTime']);
            } else if (firstMissing.includes('Note')) {
              focusFirstError(['addRecruiterNote']);
            } else if (firstMissing.includes('Role')) {
              focusFirstError(['confirmedRole']);
            } else {
              focusFirstError([
                'assignedReviewer',
                'sessionDateTime',
                'confirmedRole',
                'addRecruiterNote',
              ]);
            }
          }}
          actionLabel="Jump to missing field"
        >
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-xs text-text">
            {missingDetails.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </FormErrorSummary>
      )}

      {/* Stage Outcomes & Action Bar */}
      {!isCompletedStep && (
        <div className="border-t border-border pt-3.5 space-y-3">
          <div className="space-y-2">
            <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
              Stage Outcome
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 [&>button]:w-full sm:[&>button]:w-auto">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onRequestComplete({
                    confirmedRole: stepNumber === 2 ? confirmedRole : undefined,
                    scheduledAt: scheduledAtLocal,
                    reviewerId,
                    reviewerName,
                    selectedReviewerUser,
                  })
                }
                disabled={isPending || !canComplete}
                className="font-semibold"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Complete Step {stepNumber}
              </Button>
            </div>
          </div>

          {/* Additional Evaluation / Retake Controls */}
          {(stepNumber === 2 || stepNumber === 3 || stepNumber === 4 || stepNumber === 5) && (
            <div className="pt-2.5 border-t border-border/70 space-y-2">
              <div>
                <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                  Requires Additional Evaluation
                </div>
                <p className="text-[11px] text-muted">
                  If the candidate needs another round before passing this stage, schedule a retake
                  or return session below.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 [&>button]:w-full sm:[&>button]:w-auto">
                {/* Repeatable interview controls */}
                {stepNumber === 2 &&
                  (repeatActionKind === 'repeat_step' ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          onRequestSchedule({
                            scheduledAt: scheduledAtLocal,
                            reviewerId,
                            reviewerName,
                            selectedReviewerUser,
                            actionKind: 'repeat_step',
                          })
                        }
                        disabled={isPending || !scheduledAtLocal || (!reviewerId && !reviewerName)}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Confirm Repeat Interview (Step 2)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelRepeat}
                      >
                        Cancel Retake
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleInitiateRepeat('repeat_step')}
                      disabled={isPending}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Repeat Interview (Step 2)
                    </Button>
                  ))}

                {/* Return to Step 2 from Step 3 Orientation */}
                {stepNumber === 3 &&
                  (repeatActionKind === 'return_to_interview' ? (
                    <>
                      <Button
                        type="button"
                        variant="primaryOutline"
                        size="sm"
                        onClick={() =>
                          onRequestSchedule({
                            scheduledAt: scheduledAtLocal,
                            reviewerId,
                            reviewerName,
                            selectedReviewerUser,
                            actionKind: 'return_to_interview',
                          })
                        }
                        disabled={isPending || !scheduledAtLocal || (!reviewerId && !reviewerName)}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Confirm Return to Step 2
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelRepeat}
                      >
                        Cancel Retake
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="primaryOutline"
                      size="sm"
                      onClick={() => handleInitiateRepeat('return_to_interview')}
                      disabled={isPending}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Needs Another Interview (Return to Step 2)
                    </Button>
                  ))}

                {/* Repeatable observation controls */}
                {stepNumber === 4 &&
                  (repeatActionKind === 'repeat_step' ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          onRequestSchedule({
                            scheduledAt: scheduledAtLocal,
                            reviewerId,
                            reviewerName,
                            selectedReviewerUser,
                            actionKind: 'repeat_step',
                          })
                        }
                        disabled={isPending || !scheduledAtLocal || (!reviewerId && !reviewerName)}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Confirm Repeat Observation (Step 4)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelRepeat}
                      >
                        Cancel Retake
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => handleInitiateRepeat('repeat_step')}
                      disabled={isPending}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Repeat Observation (Step 4)
                    </Button>
                  ))}

                {/* Repeatable evaluation controls */}
                {stepNumber === 5 && (
                  <>
                    {repeatActionKind === 'repeat_step' ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            onRequestSchedule({
                              scheduledAt: scheduledAtLocal,
                              reviewerId,
                              reviewerName,
                              selectedReviewerUser,
                              actionKind: 'repeat_step',
                            })
                          }
                          disabled={
                            isPending || !scheduledAtLocal || (!reviewerId && !reviewerName)
                          }
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Confirm Repeat Evaluation (Step 5)
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelRepeat}
                        >
                          Cancel Retake
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleInitiateRepeat('repeat_step')}
                        disabled={isPending}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Repeat Evaluation (Step 5)
                      </Button>
                    )}

                    {repeatActionKind === 'return_to_observation' ? (
                      <>
                        <Button
                          type="button"
                          variant="primaryOutline"
                          size="sm"
                          onClick={() =>
                            onRequestSchedule({
                              scheduledAt: scheduledAtLocal,
                              reviewerId,
                              reviewerName,
                              selectedReviewerUser,
                              actionKind: 'return_to_observation',
                            })
                          }
                          disabled={
                            isPending || !scheduledAtLocal || (!reviewerId && !reviewerName)
                          }
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Confirm Return to Step 4
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelRepeat}
                        >
                          Cancel Retake
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="primaryOutline"
                        size="sm"
                        onClick={() => handleInitiateRepeat('return_to_observation')}
                        disabled={isPending}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Needs Another Observation (Return to Step 4)
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
