import { useMemo, useState } from 'react';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Lock,
  RotateCcw,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  Spinner,
  SundayDateTimePicker,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  useDeployRecruitmentApplicantMutation,
  useUpdateRecruitmentStageMutation,
} from '@/hooks/domain/recruitment';
import {
  RECRUITMENT_ROLES,
  RECRUITMENT_STEPS,
  type RecruitmentApplication,
  type RecruitmentPipelineTransaction,
  type RecruitmentRole,
  type RecruitmentStepNumber,
} from '@/lib/domain/recruitment';
import { formatDateTime, localDateTimeToUTC8ISO, toDatetimeLocal } from '@/lib/infrastructure';

import { BiblicalSurveyReviewPanel } from './BiblicalSurveyReviewPanel';
import { ReviewerUserPicker } from './ReviewerUserPicker';

function LockedStepCard({
  stepNumber,
  currentStep,
  onJump,
}: {
  stepNumber: number;
  currentStep: number;
  onJump: () => void;
}) {
  const currentStepLabel =
    RECRUITMENT_STEPS.find((s) => s.stepNumber === currentStep)?.shortLabel ??
    `Step ${currentStep}`;

  return (
    <div className="rounded-xl border border-border bg-background p-5 text-center space-y-2.5">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted/15 text-muted mx-auto">
        <Lock className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-heading text-xs font-bold text-text">Step {stepNumber} is Locked</h4>
        <p className="mt-1 text-xs text-muted max-w-sm mx-auto">
          You cannot schedule sessions or advance this stage until the candidate completes{' '}
          <strong className="text-text">
            Step {currentStep} ({currentStepLabel})
          </strong>
          .
        </p>
      </div>
      <div className="pt-1">
        <Button type="button" size="xs" variant="default" onClick={onJump}>
          Go to Active Step ({currentStep})
        </Button>
      </div>
    </div>
  );
}

function CompletedStepCard({ stepNumber }: { stepNumber: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background p-3.5 text-xs text-muted">
      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
      <div className="min-w-0">
        <span className="font-semibold text-text">Step {stepNumber} is Completed</span>
        <p className="text-[11px] text-muted">
          This stage was already completed. Operations are locked for completed stages to maintain
          pipeline integrity.
        </p>
      </div>
    </div>
  );
}

interface PipelineStepsPanelProps {
  application: RecruitmentApplication;
  transactions: RecruitmentPipelineTransaction[];
}

export function PipelineStepsPanel({ application, transactions }: PipelineStepsPanelProps) {
  const [selectedStep, setSelectedStep] = useState<RecruitmentStepNumber>(application.current_step);
  const { data: authState, can } = useAdminAuthQuery();
  const canWrite = can('canWriteAdminData');

  const updateStageMutation = useUpdateRecruitmentStageMutation();
  const deployMutation = useDeployRecruitmentApplicantMutation();

  // Collapsible history state
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  // Find transactions for selected step, sorted newest first
  const stepTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.step_number === selectedStep)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, selectedStep]);

  const latestStepTransaction = stepTransactions[0];
  const previousStepAttempts = stepTransactions.slice(1);

  // Form states for stage action
  const [reviewerId, setReviewerId] = useState<string>(
    latestStepTransaction?.assigned_reviewer_id ?? '',
  );
  const [reviewerName, setReviewerName] = useState<string>(
    latestStepTransaction?.assigned_reviewer_name ?? '',
  );
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(
    toDatetimeLocal(latestStepTransaction?.completed_at ?? latestStepTransaction?.scheduled_at),
  );
  const [confirmedRole, setConfirmedRole] = useState<string>(
    application.confirmed_role ?? application.desired_role,
  );
  const [notes, setNotes] = useState<string>(latestStepTransaction?.notes ?? '');
  const [applicantNotes, setApplicantNotes] = useState<string>(
    latestStepTransaction?.applicant_visible_notes ?? '',
  );
  const [ccfVmtId, setCcfVmtId] = useState<string>(application.ccf_vmt_id ?? '');
  const [ccfVmtDate, setCcfVmtDate] = useState<string>(application.ccf_vmt_date ?? '');
  const [rfidTag, setRfidTag] = useState<string>(application.assigned_rfid_member_id ?? '');

  const stepMeta = RECRUITMENT_STEPS.find((s) => s.stepNumber === selectedStep);
  const isCurrentActiveStep = application.current_step === selectedStep;
  const isCompletedStep =
    application.current_step > selectedStep || application.status === 'deployed';
  const isAllowedParallelStep = application.current_step === 2 && selectedStep === 3;
  const isActionableStep =
    application.status !== 'deployed' && (isCurrentActiveStep || isAllowedParallelStep);
  const isFutureStep = !isCompletedStep && !isActionableStep;

  const canOverrideGate =
    authState?.adminRole === 'admin' || authState?.adminRole === 'super_admin';
  const isDGroupEndorsed = Boolean(application.dgroup_approval_id);

  const missingStepDetails = useMemo(() => {
    if (selectedStep >= 2 && selectedStep <= 6) {
      const missing: string[] = [];
      if (!reviewerId?.trim() && !reviewerName?.trim()) missing.push('Assigned Reviewer / Coach');
      if (!scheduledAtLocal?.trim() && !latestStepTransaction?.scheduled_at) {
        missing.push('Session Date & Time');
      }
      if (selectedStep === 2 && !confirmedRole) {
        missing.push('Confirmed Ministry Role');
      }
      if (selectedStep === 4 && !isDGroupEndorsed && !canOverrideGate) {
        missing.push('DGroup Leader Endorsement');
      }
      if (!notes?.trim()) {
        missing.push('Recruitment Notes / Feedback');
      }
      return missing;
    }
    if (selectedStep === 7) {
      const missing: string[] = [];
      if (!ccfVmtId?.trim()) missing.push('CCF VMT ID');
      if (!ccfVmtDate?.trim()) missing.push('CCF VMT Registration Date');
      return missing;
    }
    if (selectedStep === 8) {
      const missing: string[] = [];
      if (!rfidTag?.trim()) missing.push('Assigned Physical RFID Tag');
      return missing;
    }
    return [];
  }, [
    selectedStep,
    reviewerId,
    reviewerName,
    scheduledAtLocal,
    latestStepTransaction?.scheduled_at,
    confirmedRole,
    isDGroupEndorsed,
    canOverrideGate,
    notes,
    ccfVmtId,
    ccfVmtDate,
    rfidTag,
  ]);

  const canCompleteCurrentStep = missingStepDetails.length === 0;

  const canDeploy =
    isActionableStep &&
    selectedStep === 9 &&
    canWrite &&
    (authState?.adminRole === 'admin' ||
      authState?.adminRole === 'super_admin' ||
      authState?.adminRole === 'slod');

  const roleOptions = RECRUITMENT_ROLES.map((role) => ({
    label: role,
    value: role,
  }));

  const handleStepSelect = (stepNum: RecruitmentStepNumber) => {
    setSelectedStep(stepNum);
    const tx = [...transactions]
      .filter((t) => t.step_number === stepNum)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    setReviewerId(tx?.assigned_reviewer_id ?? '');
    setReviewerName(tx?.assigned_reviewer_name ?? '');
    setScheduledAtLocal(toDatetimeLocal(tx?.completed_at ?? tx?.scheduled_at));
    setNotes(tx?.notes ?? '');
    setApplicantNotes(tx?.applicant_visible_notes ?? '');
    if (stepNum === 7) {
      setCcfVmtId(application.ccf_vmt_id ?? '');
      setCcfVmtDate(application.ccf_vmt_date ?? '');
    }
    if (stepNum === 8) {
      setRfidTag(application.assigned_rfid_member_id ?? '');
    }
  };

  const handleUpdateStage = (
    status: 'scheduled' | 'completed' | 'in_progress',
    action:
      | 'update_stage'
      | 'repeat_step'
      | 'return_to_observation'
      | 'return_to_interview' = 'update_stage',
  ) => {
    const isoScheduledAt = scheduledAtLocal?.trim()
      ? localDateTimeToUTC8ISO(scheduledAtLocal)
      : null;

    // Confirmed role is finalized during Step 2 (Interview).
    // Only send on Step 2, or if not yet recorded on the application record.
    const effectiveConfirmedRole =
      selectedStep === 2
        ? (confirmedRole as RecruitmentRole)
        : application.confirmed_role
          ? undefined
          : confirmedRole
            ? (confirmedRole as RecruitmentRole)
            : undefined;

    updateStageMutation.mutate(
      {
        action,
        application_id: application.id,
        step_number: selectedStep,
        status,
        scheduled_at: isoScheduledAt,
        assigned_reviewer_id: reviewerId || null,
        assigned_reviewer_name: reviewerName || null,
        confirmed_role: effectiveConfirmedRole,
        notes: notes.trim() || null,
        applicant_visible_notes: applicantNotes.trim() || null,
        ccf_vmt_id: ccfVmtId.trim() || null,
        ccf_vmt_date: ccfVmtDate || null,
        assigned_rfid_member_id: rfidTag.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success(
            action === 'repeat_step'
              ? `Scheduled another session for Step ${selectedStep}`
              : action === 'return_to_observation'
                ? 'Returned candidate to Observation for another session'
                : action === 'return_to_interview'
                  ? 'Returned candidate to Interview (Step 2) for another session'
                  : `Step ${selectedStep} updated successfully`,
          );
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to update stage');
        },
      },
    );
  };

  const handleDeploy = () => {
    deployMutation.mutate(application.id, {
      onSuccess: () => {
        toast.success(`Successfully deployed ${application.full_name} to Welcome Center!`);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to deploy volunteer');
      },
    });
  };

  const formatActivityTitle = (tx: RecruitmentPipelineTransaction) => {
    switch (tx.transaction_type) {
      case 'completed':
        return `Step ${tx.step_number} Completed`;
      case 'scheduled':
        return `Session Scheduled for Step ${tx.step_number}`;
      case 'rescheduled':
        return `Session Rescheduled for Step ${tx.step_number}`;
      case 'repeated_step':
        return `Repeat Session Scheduled for Step ${tx.step_number}`;
      case 'returned_to_observation':
        return 'Returned to Observation (Step 4)';
      case 'returned_to_interview':
        return 'Returned to Interview (Step 2)';
      default:
        return `Step ${tx.step_number} Activity`;
    }
  };

  return (
    <div className="space-y-4">
      {/* 9-Step Pipeline Stepper Navigation */}
      <Tabs
        value={String(selectedStep)}
        onValueChange={(val) => handleStepSelect(Number(val) as RecruitmentStepNumber)}
      >
        <TabsList containerClassName="justify-start" className="w-full">
          {RECRUITMENT_STEPS.map((s) => {
            const isStepCurrent = application.current_step === s.stepNumber;
            const isStepCompleted =
              application.current_step > s.stepNumber || application.status === 'deployed';
            const isStepSelected = selectedStep === s.stepNumber;
            const isAllowedParallel = application.current_step === 2 && s.stepNumber === 3;
            const isStepLocked = !isStepCompleted && !isStepCurrent && !isAllowedParallel;

            return (
              <TabsTrigger
                key={s.stepNumber}
                value={String(s.stepNumber)}
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm gap-2 rounded-full whitespace-nowrap transition-all border-2 ${
                  isStepSelected
                    ? 'border-primary bg-primary text-white font-bold shadow-xs'
                    : isStepCurrent
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : isStepCompleted
                        ? 'border-transparent text-text hover:bg-surface-hover'
                        : isStepLocked
                          ? 'border-transparent text-muted/60 hover:text-text'
                          : 'border-transparent text-muted hover:text-text'
                }`}
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  {isStepCompleted ? (
                    <CheckCircle2
                      className={`h-4 w-4 shrink-0 ${isStepSelected ? 'text-white' : 'text-emerald-500'}`}
                    />
                  ) : isStepLocked ? (
                    <Lock
                      className={`h-3.5 w-3.5 shrink-0 ${isStepSelected ? 'text-white' : 'text-muted'}`}
                    />
                  ) : (
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold leading-none ${
                        isStepSelected
                          ? 'bg-white/20 text-white'
                          : isStepCurrent
                            ? 'bg-primary text-white'
                            : 'bg-surface-hover text-text'
                      }`}
                    >
                      {s.stepNumber}
                    </span>
                  )}
                </div>
                <span className="whitespace-nowrap font-medium">{s.shortLabel}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Viewing other step notice banner */}
      {!isCurrentActiveStep && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-border bg-background p-3 text-xs text-text">
          <div>
            <strong>
              Viewing {isCompletedStep ? 'Completed' : isFutureStep ? 'Locked' : 'Parallel'} Step{' '}
              {selectedStep}: {stepMeta?.title}
            </strong>
            <p className="text-muted text-[11px]">
              {isCompletedStep
                ? 'This step was previously passed. Operations are locked to maintain pipeline integrity.'
                : isFutureStep
                  ? `This step is locked until Step ${application.current_step} is completed.`
                  : 'Orientation can be scheduled in parallel while completing Step 2 interview.'}
            </p>
          </div>
          <Button
            type="button"
            size="xs"
            variant="primaryOutline"
            className="w-full sm:w-auto shrink-0"
            onClick={() => handleStepSelect(application.current_step)}
          >
            Jump to Active Step ({application.current_step})
          </Button>
        </div>
      )}

      {/* Smart Action Card: On-Theme Surface Card */}
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isCurrentActiveStep ? 'default' : 'secondary'}>
                {isCurrentActiveStep ? `Active Step ${selectedStep}` : `Step ${selectedStep}`}
              </Badge>
              <h3 className="font-heading text-base font-bold text-text truncate flex items-center gap-1.5">
                {stepMeta?.title}
                {isFutureStep && <Lock className="h-3.5 w-3.5 text-muted shrink-0" />}
              </h3>
            </div>
            <p className="mt-1 text-xs text-muted">{stepMeta?.description}</p>
          </div>

          <Badge variant={isCompletedStep ? 'default' : isActionableStep ? 'accent' : 'secondary'}>
            {isCompletedStep
              ? 'Completed'
              : isActionableStep
                ? isCurrentActiveStep
                  ? 'In Progress'
                  : 'Parallel Session'
                : 'Locked'}
          </Badge>
        </div>

        {/* Step 1: Intake, Survey & DGroup summary */}
        {selectedStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-2.5 text-xs text-text rounded-xl border border-border bg-background p-3.5">
              <p>
                <strong>Application Submitted:</strong> {formatDateTime(application.created_at)}
              </p>
              <p>
                <strong>DGroup Leader:</strong> {application.dgroup_info.leader_name} (
                {application.dgroup_info.leader_email})
              </p>
              <p>
                <strong>DGroup Endorsement Status:</strong>{' '}
                {application.dgroup_approval_id ? (
                  <span className="text-primary font-semibold">Endorsed</span>
                ) : (
                  <span className="text-muted font-semibold">Pending Leader Endorsement</span>
                )}
              </p>
            </div>

            {/* Biblical Survey Results */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-text">
                  Biblical Survey Results
                </h4>
              </div>
              <BiblicalSurveyReviewPanel application={application} />
            </div>
          </div>
        )}

        {/* Steps 2 through 6: Coaching, Observation & Evaluation sessions */}
        {selectedStep >= 2 && selectedStep <= 6 && (
          <div className="space-y-4">
            {isFutureStep ? (
              <LockedStepCard
                stepNumber={selectedStep}
                currentStep={application.current_step}
                onJump={() => handleStepSelect(application.current_step)}
              />
            ) : (
              <>
                {isCompletedStep && <CompletedStepCard stepNumber={selectedStep} />}

                {/* Step 4 DGroup Endorsement Gate Warning */}
                {!isCompletedStep && selectedStep === 4 && !isDGroupEndorsed && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-text space-y-1">
                    <p className="font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      DGroup Leader Endorsement Pending
                    </p>
                    <p className="text-muted text-[11px]">
                      Pastoral / DGroup endorsement from{' '}
                      <strong>{application.dgroup_info.leader_name}</strong> is required before
                      observation.
                      {!canOverrideGate &&
                        ' Completing this step is locked until endorsement is approved.'}
                    </p>
                  </div>
                )}

                {/* Previous attempts history for this step (kept intact) */}
                {previousStepAttempts.length > 0 && (
                  <div className="rounded-xl border border-border/80 bg-surface/60 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5 text-primary" />
                        <h4 className="font-semibold text-xs text-text">
                          Previous {selectedStep === 2 ? 'Interview' : stepMeta?.shortLabel}{' '}
                          Attempts ({previousStepAttempts.length})
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
                          className="rounded-lg border border-border/60 bg-background p-2.5 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-semibold text-text">
                              Attempt #{tx.attempt_number}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="text-[10px] capitalize py-0 px-1.5"
                              >
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
                              <strong className="text-text">
                                {tx.assigned_reviewer_name || 'None'}
                              </strong>
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
                              <span className="font-medium text-muted block mb-0.5">
                                Recruitment Notes:
                              </span>
                              <p className="whitespace-pre-wrap">{tx.notes}</p>
                            </div>
                          )}
                          {tx.applicant_visible_notes && (
                            <div className="mt-1 rounded-md bg-surface p-2 text-[11px] text-text border border-border/40">
                              <span className="font-medium text-muted block mb-0.5">
                                Applicant Instructions:
                              </span>
                              <p className="whitespace-pre-wrap">{tx.applicant_visible_notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session & Evaluation Details Card */}
                <div className="rounded-xl border border-border bg-background p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-text flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      {isCompletedStep
                        ? 'Recorded Session & Evaluation Details'
                        : 'Session & Evaluation Details'}
                      {latestStepTransaction?.attempt_number &&
                        latestStepTransaction.attempt_number > 1 && (
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    <ReviewerUserPicker
                      id="assignedReviewer"
                      label="Assigned Reviewer / Coach"
                      required={!isCompletedStep}
                      disabled={isCompletedStep}
                      value={reviewerId}
                      reviewerName={reviewerName}
                      onChange={(id, user) => {
                        setReviewerId(id);
                        setReviewerName(user?.name || user?.full_name || '');
                      }}
                    />

                    <SundayDateTimePicker
                      id="sessionDateTime"
                      label={
                        isCompletedStep ? 'Session / Completion Date & Time' : 'Session Date & Time'
                      }
                      required={!isCompletedStep}
                      disabled={isCompletedStep}
                      readOnly={isCompletedStep}
                      value={scheduledAtLocal}
                      onChange={(value) => setScheduledAtLocal(value)}
                      maxPastDays={null}
                      align="right"
                    />
                  </div>

                  {/* Step 2 Interview: Final Ministry Role Assignment */}
                  {selectedStep === 2 && (
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
                  {selectedStep > 2 && (
                    <div className="flex items-center justify-between gap-2 border-t border-border/80 pt-2 text-xs">
                      <span className="text-muted">Final Ministry Role:</span>
                      <Badge variant="default" className="font-semibold text-xs">
                        {application.confirmed_role || confirmedRole}
                      </Badge>
                    </div>
                  )}

                  {/* Recruitment Notes & Instructions */}
                  <div className="border-t border-border/80 pt-3 space-y-3">
                    <FormTextareaField
                      label={isCompletedStep ? 'Recruitment Notes' : 'Recruitment Notes *'}
                      placeholder={
                        isCompletedStep
                          ? 'No Recruitment Notes recorded'
                          : 'Enter evaluation feedback, candidate observations, and notes for ministry leadership...'
                      }
                      rows={2}
                      disabled={isCompletedStep}
                      readOnly={isCompletedStep}
                      textareaClassName="resize-none"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      helperText={
                        isCompletedStep
                          ? undefined
                          : 'Required before completing this step. Saved to candidate pipeline history.'
                      }
                    />

                    {(applicantNotes || !isCompletedStep) && (
                      <FormTextareaField
                        label="Applicant-Visible Instructions (Optional)"
                        placeholder={
                          isCompletedStep
                            ? 'None provided'
                            : 'Instructions shown to the applicant on their progress portal...'
                        }
                        rows={2}
                        disabled={isCompletedStep}
                        readOnly={isCompletedStep}
                        textareaClassName="resize-none"
                        value={applicantNotes}
                        onChange={(event) => setApplicantNotes(event.target.value)}
                      />
                    )}
                  </div>
                </div>

                {/* Missing Details Checklist Notice */}
                {!isCompletedStep && !canCompleteCurrentStep && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">
                        Required before completing Step {selectedStep}:
                      </span>
                      <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-text">
                        {missingStepDetails.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Primary Action Button Bar */}
                {!isCompletedStep && (
                  <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5">
                    <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                      Stage Action
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 [&>button]:w-full sm:[&>button]:w-auto">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleUpdateStage('completed')}
                        disabled={updateStageMutation.isPending || !canCompleteCurrentStep}
                        className="font-semibold"
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Complete Step {selectedStep}
                      </Button>

                      {/* Schedule / Reschedule ahead of time button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUpdateStage('scheduled')}
                        disabled={
                          updateStageMutation.isPending ||
                          !scheduledAtLocal ||
                          (!reviewerId && !reviewerName)
                        }
                      >
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        {latestStepTransaction?.scheduled_at
                          ? 'Update Schedule'
                          : 'Schedule Session'}
                      </Button>

                      {/* Repeatable interview controls */}
                      {selectedStep === 2 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateStage('scheduled', 'repeat_step')}
                          disabled={
                            updateStageMutation.isPending ||
                            !scheduledAtLocal ||
                            (!reviewerId && !reviewerName)
                          }
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Repeat Interview (Step 2)
                        </Button>
                      )}

                      {/* Return to Step 2 from Step 3 Orientation */}
                      {selectedStep === 3 && (
                        <Button
                          type="button"
                          variant="primaryOutline"
                          size="sm"
                          onClick={() => handleUpdateStage('scheduled', 'return_to_interview')}
                          disabled={updateStageMutation.isPending}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Needs Another Interview (Return to Step 2)
                        </Button>
                      )}

                      {/* Repeatable observation controls */}
                      {selectedStep === 4 && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateStage('scheduled', 'repeat_step')}
                          disabled={updateStageMutation.isPending || !scheduledAtLocal}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          Repeat Observation (Step 4)
                        </Button>
                      )}

                      {/* Repeatable evaluation controls */}
                      {selectedStep === 5 && (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUpdateStage('scheduled', 'repeat_step')}
                            disabled={updateStageMutation.isPending || !scheduledAtLocal}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Repeat Evaluation (Step 5)
                          </Button>

                          <Button
                            type="button"
                            variant="primaryOutline"
                            size="sm"
                            onClick={() => handleUpdateStage('scheduled', 'return_to_observation')}
                            disabled={updateStageMutation.isPending}
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Needs Another Observation (Return to Step 4)
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 7: VMT Registration */}
        {selectedStep === 7 && (
          <div className="space-y-3">
            {isFutureStep ? (
              <LockedStepCard
                stepNumber={7}
                currentStep={application.current_step}
                onJump={() => handleStepSelect(application.current_step)}
              />
            ) : (
              <>
                {isCompletedStep && <CompletedStepCard stepNumber={7} />}

                <div className="rounded-xl border border-border bg-background p-3 text-xs">
                  <p>
                    <strong>Applicant Self-Attestation:</strong>{' '}
                    {application.vmt_registered ? (
                      <span className="text-primary font-semibold">
                        Completed on {formatDateTime(application.vmt_registered_at)}
                      </span>
                    ) : (
                      <span className="text-muted">Pending applicant confirmation</span>
                    )}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormInputField
                    label={isCompletedStep ? 'CCF VMT ID' : 'CCF VMT ID *'}
                    placeholder="e.g. VMT-12345"
                    disabled={isCompletedStep}
                    readOnly={isCompletedStep}
                    value={ccfVmtId || application.ccf_vmt_id || ''}
                    onChange={(event) => setCcfVmtId(event.target.value)}
                  />

                  <FormInputField
                    label={
                      isCompletedStep ? 'CCF VMT Registration Date' : 'CCF VMT Registration Date *'
                    }
                    type="date"
                    disabled={isCompletedStep}
                    readOnly={isCompletedStep}
                    value={ccfVmtDate || application.ccf_vmt_date || ''}
                    onChange={(event) => setCcfVmtDate(event.target.value)}
                  />
                </div>

                {!isCompletedStep && !canCompleteCurrentStep && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">Required before completing Step 7:</span>
                      <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-text">
                        {missingStepDetails.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {!isCompletedStep && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => handleUpdateStage('completed')}
                      disabled={updateStageMutation.isPending || !canCompleteCurrentStep}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Verify & Complete Step 7
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 8: RFID Releasing */}
        {selectedStep === 8 && (
          <div className="space-y-3">
            {isFutureStep ? (
              <LockedStepCard
                stepNumber={8}
                currentStep={application.current_step}
                onJump={() => handleStepSelect(application.current_step)}
              />
            ) : (
              <>
                {isCompletedStep && <CompletedStepCard stepNumber={8} />}

                <div className="rounded-xl border border-border bg-background p-3 text-xs">
                  <h4 className="font-semibold text-text">Selected Sunday Commitments:</h4>
                  <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
                    {Object.entries(application.service_commitments ?? {}).map(([key, slots]) => (
                      <div key={key} className="text-muted">
                        <span className="capitalize">{key.replace('_', ' ')}:</span>{' '}
                        <span className="font-semibold text-text">
                          {slots?.join(', ') || 'None'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <FormInputField
                  label={
                    isCompletedStep
                      ? 'Assigned Physical RFID Tag (Member ID)'
                      : 'Assigned Physical RFID Tag (Member ID) *'
                  }
                  placeholder="e.g. 1000123"
                  disabled={isCompletedStep}
                  readOnly={isCompletedStep}
                  value={rfidTag || application.assigned_rfid_member_id || ''}
                  onChange={(event) => setRfidTag(event.target.value)}
                  helperText={
                    isCompletedStep
                      ? undefined
                      : 'Physical RFID tag number scanned or assigned to this volunteer.'
                  }
                />

                {!isCompletedStep && !canCompleteCurrentStep && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-semibold">Required before completing Step 8:</span>
                      <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-text">
                        {missingStepDetails.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {!isCompletedStep && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => handleUpdateStage('completed')}
                      disabled={updateStageMutation.isPending || !canCompleteCurrentStep}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Assign RFID & Complete Step 8
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 9: Final Deployment */}
        {selectedStep === 9 && (
          <div className="space-y-3">
            {isFutureStep ? (
              <LockedStepCard
                stepNumber={9}
                currentStep={application.current_step}
                onJump={() => handleStepSelect(application.current_step)}
              />
            ) : (
              <>
                <div className="rounded-xl border border-border bg-background p-3 text-xs space-y-1.5">
                  <p>
                    <strong>Volunteer:</strong> {application.full_name} ({confirmedRole})
                  </p>
                  <p>
                    <strong>RFID / Member ID:</strong>{' '}
                    {application.assigned_rfid_member_id || 'Not assigned yet'}
                  </p>
                  <p>
                    <strong>Status:</strong>{' '}
                    {application.status === 'deployed' ? (
                      <span className="text-primary font-bold">
                        Deployed on {formatDateTime(application.deployed_at)}
                      </span>
                    ) : (
                      <span>Ready for final deployment into Welcome Center membership</span>
                    )}
                  </p>
                </div>

                {application.status !== 'deployed' && (
                  <div className="pt-1">
                    {canDeploy ? (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={handleDeploy}
                        disabled={deployMutation.isPending || !application.assigned_rfid_member_id}
                      >
                        {deployMutation.isPending ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-1.5 h-4 w-4" />
                            Deploy Volunteer to Welcome Center
                          </>
                        )}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted italic">
                        Final Step 9 Deployment to active Welcome Center member is reserved for
                        Admins and SLODs.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Activity & Coaching History (Compact Collapsible Feed) */}
      <div className="rounded-xl border border-border bg-surface p-3 sm:p-3.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setIsHistoryOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-left cursor-pointer"
          aria-expanded={isHistoryOpen}
        >
          <div className="flex items-center gap-2 min-w-0">
            <History className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-heading text-xs font-bold text-text">
                  Pipeline Transaction History
                </h4>
                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                  {transactions.length}
                </Badge>
              </div>
              <p className="text-[10px] text-muted truncate">
                Activity log of scheduled sessions, attempts, and notes
              </p>
            </div>
          </div>
          <div className="text-muted hover:text-text shrink-0 p-1">
            {isHistoryOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>

        {isHistoryOpen && (
          <div className="mt-2.5 border-t border-border/70 pt-2">
            {transactions.length === 0 ? (
              <p className="text-xs text-muted py-1.5">
                No activity recorded yet for this applicant.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto divide-y divide-border/60 pr-1">
                {[...transactions].reverse().map((tx) => (
                  <div key={tx.id} className="py-2 first:pt-0 last:pb-0 text-xs space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="font-medium text-text">{formatActivityTitle(tx)}</span>
                        <span className="text-muted text-[10px] font-mono">
                          Attempt #{tx.attempt_number} ({tx.transaction_type.replace('_', ' ')})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                          {tx.status}
                        </Badge>
                        <span className="text-[10px] text-muted font-mono">
                          {formatDateTime(tx.created_at)}
                        </span>
                      </div>
                    </div>

                    {(tx.scheduled_at || tx.assigned_reviewer_name) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted">
                        {tx.scheduled_at && (
                          <span>
                            Scheduled:{' '}
                            <strong className="text-text">{formatDateTime(tx.scheduled_at)}</strong>
                          </span>
                        )}
                        {tx.assigned_reviewer_name && (
                          <span>
                            Coach:{' '}
                            <strong className="text-text">{tx.assigned_reviewer_name}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    {tx.notes && (
                      <p className="text-[11px] text-muted italic bg-background rounded-md px-2 py-1 border border-border/50">
                        <span className="font-medium not-italic text-text">Note: </span>
                        {tx.notes}
                      </p>
                    )}

                    {tx.applicant_visible_notes && (
                      <p className="text-[11px] text-muted bg-background rounded-md px-2 py-1 border border-border/50">
                        <span className="font-medium text-text">Applicant visible: </span>
                        {tx.applicant_visible_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
