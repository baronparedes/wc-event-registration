import { useState } from 'react';

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  MessageSquare,
  Plus,
  RotateCcw,
} from 'lucide-react';

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
import { StepAttemptsHistoryDialog } from '../StepAttemptsHistoryDialog';
import { StepRecruiterNotesDialog } from '../StepRecruiterNotesDialog';
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
  const latestStepNote = currentStepNotes[currentStepNotes.length - 1];
  const { focusFirstError } = useFormErrorFocus();

  const [isAttemptsDialogOpen, setIsAttemptsDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);

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

  if (isFutureStep) {
    return (
      <LockedStepCard
        stepNumber={stepNumber}
        currentStep={application.current_step}
        onJump={onJumpToActive}
      />
    );
  }

  const isSessionScheduled = Boolean(
    latestStepTransaction?.status === 'scheduled' ||
    (latestStepTransaction?.status === 'completed' && latestStepTransaction?.scheduled_at),
  );

  const hasAssignedReviewer = Boolean(reviewerId?.trim() || reviewerName?.trim());
  const hasScheduledAt = Boolean(scheduledAtLocal?.trim() || latestStepTransaction?.scheduled_at);

  const missingDetails: string[] = [];
  if (!isSessionScheduled) {
    missingDetails.push('Session must be scheduled first');
  }
  if (!hasAssignedReviewer) missingDetails.push('Assigned To');
  if (!hasScheduledAt) missingDetails.push('Session Date & Time');
  if (stepNumber === 2 && !confirmedRole) missingDetails.push('Confirmed Ministry Role');
  if (stepNumber === 4 && !isDGroupEndorsed && !canOverrideGate) {
    missingDetails.push('DGroup Leader Endorsement');
  }

  const canComplete = missingDetails.length === 0;

  return (
    <div className="space-y-4">
      {isCompletedStep && (
        <div className="space-y-3">
          <CompletedStepCard stepNumber={stepNumber} />
          {stepNumber === 4 && application.current_step === 5 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-xs">
              <div>
                <strong className="text-text font-semibold">
                  Return Candidate to Step 4 (Observation)
                </strong>
                <p className="text-muted text-[11px] mt-0.5">
                  Candidate is currently at Step 5. If they need another observation round, you can
                  return them to Step 4.
                </p>
              </div>
              <Button
                type="button"
                variant="primaryOutline"
                size="sm"
                onClick={() =>
                  onRequestSchedule({
                    scheduledAt: '',
                    reviewerId: '',
                    reviewerName: '',
                    selectedReviewerUser: null,
                    actionKind: 'return_to_observation',
                  })
                }
                disabled={isPending}
                className="shrink-0 font-medium"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Return to Step 4
              </Button>
            </div>
          )}
          {stepNumber === 2 && application.current_step === 3 && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-secondary/40 bg-secondary/10 p-3 text-xs">
              <div>
                <strong className="text-text font-semibold">
                  Return Candidate to Step 2 (Interview)
                </strong>
                <p className="text-muted text-[11px] mt-0.5">
                  Candidate is currently at Step 3. If they need another interview round, you can
                  return them to Step 2.
                </p>
              </div>
              <Button
                type="button"
                variant="primaryOutline"
                size="sm"
                onClick={() =>
                  onRequestSchedule({
                    scheduledAt: '',
                    reviewerId: '',
                    reviewerName: '',
                    selectedReviewerUser: null,
                    actionKind: 'return_to_interview',
                  })
                }
                disabled={isPending}
                className="shrink-0 font-medium"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Return to Step 2
              </Button>
            </div>
          )}
        </div>
      )}

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

      {/* Previous attempts summary card */}
      {previousStepAttempts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-surface p-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-text flex items-center gap-2">
                <span>
                  Previous {stepNumber === 2 ? 'Interview' : stepMeta?.shortLabel} Attempts
                </span>
                <Badge variant="secondary" className="text-[10px] font-normal py-0 px-1.5">
                  {previousStepAttempts.length}
                </Badge>
              </div>
              <p className="text-[11px] text-muted truncate mt-0.5">
                Attempt #{latestStepTransaction?.attempt_number ?? 1} in progress · Recorded history
                intact
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primaryOutline"
            size="sm"
            onClick={() => setIsAttemptsDialogOpen(true)}
            className="shrink-0 w-full sm:w-auto font-medium"
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View Past Attempts ({previousStepAttempts.length})
          </Button>
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
                {latestStepTransaction?.scheduled_at ? (
                  <span>
                    Session scheduled for{' '}
                    <strong className="text-text">
                      {formatDateTime(latestStepTransaction.scheduled_at)}
                    </strong>
                    . Pick a new Sunday date or coach above to reschedule.
                  </span>
                ) : (
                  <span>
                    Assign a coach and select a Sunday date & time above, then click{' '}
                    <strong className="text-text">Save Schedule</strong>. Sessions must be scheduled
                    before completing this step.
                  </span>
                )}
              </div>
              <Button
                id="saveScheduleButton"
                type="button"
                variant={isSessionScheduled ? 'primaryOutline' : 'default'}
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
                {latestStepTransaction?.scheduled_at ? 'Update Schedule' : 'Save Schedule'}
              </Button>
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

        {/* Recruiter Notes Summary Card */}
        <div className="border-t border-border/80 pt-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-surface p-3 text-xs">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text">Recruiter Notes</span>
                  <Badge
                    variant={currentStepNotes.length > 0 ? 'secondary' : 'outline'}
                    className="text-[10px] font-normal py-0 px-1.5"
                  >
                    {currentStepNotes.length}
                  </Badge>
                  {currentStepNotes.length === 0 && !isCompletedStep && (
                    <span className="text-[10px] text-amber-700 font-medium">Required</span>
                  )}
                </div>
                {latestStepNote ? (
                  <p className="text-[11px] text-muted truncate mt-0.5 max-w-md">
                    <strong className="text-text font-medium">
                      {latestStepNote.author_name}:{' '}
                    </strong>
                    {latestStepNote.content}
                  </p>
                ) : (
                  <p className="text-[11px] text-muted mt-0.5">
                    {isCompletedStep
                      ? 'No notes recorded for this step.'
                      : 'At least one recruiter note is required before completing this step.'}
                  </p>
                )}
              </div>
            </div>
            <Button
              id="openRecruiterNotesButton"
              type="button"
              variant={
                currentStepNotes.length === 0 && !isCompletedStep ? 'default' : 'primaryOutline'
              }
              size="sm"
              onClick={() => setIsNotesDialogOpen(true)}
              className="shrink-0 w-full sm:w-auto font-medium"
            >
              {currentStepNotes.length > 0 ? (
                <>
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                  Open Notes ({currentStepNotes.length})
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Note
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Missing Details Checklist Notice */}
      {!isCompletedStep && !canComplete && (
        <FormErrorSummary
          errorCount={missingDetails.length}
          title={`Required before completing Step ${stepNumber}:`}
          onJumpToFirstError={() => {
            const firstMissing = missingDetails[0] ?? '';
            if (firstMissing.includes('scheduled')) {
              focusFirstError(['saveScheduleButton', 'sessionDateTime', 'assignedReviewer']);
            } else if (
              firstMissing.includes('Assigned') ||
              firstMissing.includes('Coach') ||
              firstMissing.includes('Reviewer')
            ) {
              focusFirstError(['assignedReviewer']);
            } else if (firstMissing.includes('Date')) {
              focusFirstError(['sessionDateTime']);
            } else if (firstMissing.includes('Note')) {
              setIsNotesDialogOpen(true);
              setTimeout(() => {
                document.getElementById('addRecruiterNote')?.focus();
              }, 100);
            } else if (firstMissing.includes('Role')) {
              focusFirstError(['confirmedRole']);
            } else {
              focusFirstError([
                'saveScheduleButton',
                'assignedReviewer',
                'sessionDateTime',
                'confirmedRole',
                'openRecruiterNotesButton',
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
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                Stage Outcome
              </div>
              {!isSessionScheduled && (
                <span className="text-[11px] text-muted font-medium">
                  Requires scheduled session before completion
                </span>
              )}
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

              {/* Conclude & Repeat current step (available once scheduled) */}
              {isSessionScheduled && (stepNumber === 2 || stepNumber === 4 || stepNumber === 5) && (
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
                  disabled={isPending}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  {stepNumber === 2
                    ? 'Needs Another Interview (Repeat Step 2)'
                    : stepNumber === 4
                      ? 'Needs Another Observation (Repeat Step 4)'
                      : 'Needs Another Evaluation (Repeat Step 5)'}
                </Button>
              )}

              {/* Step 5: Return to Step 4 Observation */}
              {isSessionScheduled && stepNumber === 5 && (
                <Button
                  type="button"
                  variant="primaryOutline"
                  size="sm"
                  onClick={() =>
                    onRequestSchedule({
                      scheduledAt: '',
                      reviewerId: '',
                      reviewerName: '',
                      selectedReviewerUser: null,
                      actionKind: 'return_to_observation',
                    })
                  }
                  disabled={isPending}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Needs Another Observation (Return to Step 4)
                </Button>
              )}

              {/* Step 3: Return to Step 2 Interview */}
              {isSessionScheduled && stepNumber === 3 && (
                <Button
                  type="button"
                  variant="primaryOutline"
                  size="sm"
                  onClick={() =>
                    onRequestSchedule({
                      scheduledAt: '',
                      reviewerId: '',
                      reviewerName: '',
                      selectedReviewerUser: null,
                      actionKind: 'return_to_interview',
                    })
                  }
                  disabled={isPending}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Needs Another Interview (Return to Step 2)
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-modals for Attempts History and Recruiter Notes */}
      {isAttemptsDialogOpen && (
        <StepAttemptsHistoryDialog
          isOpen={isAttemptsDialogOpen}
          onClose={() => setIsAttemptsDialogOpen(false)}
          stepNumber={stepNumber}
          stepTitle={stepMeta?.title ?? `Step ${stepNumber}`}
          attempts={previousStepAttempts}
        />
      )}

      {isNotesDialogOpen && (
        <StepRecruiterNotesDialog
          isOpen={isNotesDialogOpen}
          onClose={() => setIsNotesDialogOpen(false)}
          applicationId={application.id}
          stepNumber={stepNumber}
          stepTitle={stepMeta?.title ?? `Step ${stepNumber}`}
          notes={currentStepNotes}
          isCompletedStep={isCompletedStep}
        />
      )}
    </div>
  );
}
