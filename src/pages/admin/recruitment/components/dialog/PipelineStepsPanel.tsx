import { useMemo, useState } from 'react';

import { AlertCircle, CheckCircle2, Clock, Lock, RotateCcw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  FormInputField,
  FormSelectField,
  Spinner,
  SundayAvailabilityTable,
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
  type ApplicantCommitments,
  RECRUITMENT_ROLES,
  RECRUITMENT_STEPS,
  type RecruiterNote,
  type RecruitmentApplication,
  type RecruitmentApplicationDetail,
  type RecruitmentPipelineTransaction,
  type RecruitmentRole,
  type RecruitmentServiceSlot,
  type RecruitmentStepNumber,
  type ReviewerUserItem,
} from '@/lib/domain/recruitment';
import { formatDateTime, localDateTimeToUTC8ISO, toDatetimeLocal } from '@/lib/infrastructure';

import { BiblicalSurveyReviewPanel } from './BiblicalSurveyReviewPanel';
import { CompleteStepConfirmDialog } from './CompleteStepConfirmDialog';
import { ReviewerUserPicker } from './ReviewerUserPicker';
import {
  type ScheduleActionKind,
  ScheduleSessionConfirmDialog,
} from './ScheduleSessionConfirmDialog';
import { StepRecruiterNotesThread } from './StepRecruiterNotesThread';

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
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center space-y-2.5">
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
    <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted">
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
  endorsement?: RecruitmentApplicationDetail['dgroup_endorsement'];
  stepNotes?: RecruiterNote[];
}

export function PipelineStepsPanel({
  application,
  transactions,
  endorsement,
  stepNotes = [],
}: PipelineStepsPanelProps) {
  const [selectedStep, setSelectedStep] = useState<RecruitmentStepNumber>(application.current_step);
  const { data: authState, can } = useAdminAuthQuery();
  const canWrite = can('canWriteAdminData');

  const updateStageMutation = useUpdateRecruitmentStageMutation();
  const deployMutation = useDeployRecruitmentApplicantMutation();

  // Find transactions for selected step, sorted newest first
  const stepTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.step_number === selectedStep)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, selectedStep]);

  const currentStepNotes = useMemo(() => {
    return (stepNotes ?? []).filter((n) => n.step_number === selectedStep);
  }, [stepNotes, selectedStep]);

  const latestStepTransaction = stepTransactions[0];
  const previousStepAttempts = stepTransactions.slice(1);

  // Form states for stage action
  const [reviewerId, setReviewerId] = useState<string>(
    latestStepTransaction?.assigned_reviewer_id ?? '',
  );
  const [reviewerName, setReviewerName] = useState<string>(
    latestStepTransaction?.assigned_reviewer_name ?? '',
  );
  const [selectedReviewerUser, setSelectedReviewerUser] = useState<ReviewerUserItem | null>(null);
  const [pendingScheduleAction, setPendingScheduleAction] = useState<{
    status: 'scheduled';
    action: 'update_stage' | 'repeat_step' | 'return_to_observation' | 'return_to_interview';
    actionKind: ScheduleActionKind;
  } | null>(null);
  const [repeatActionKind, setRepeatActionKind] = useState<
    'repeat_step' | 'return_to_interview' | 'return_to_observation' | null
  >(null);
  const [isPendingCompletionConfirm, setIsPendingCompletionConfirm] = useState(false);
  const [isPendingDeployConfirm, setIsPendingDeployConfirm] = useState(false);
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(
    toDatetimeLocal(latestStepTransaction?.completed_at ?? latestStepTransaction?.scheduled_at),
  );
  const [confirmedRole, setConfirmedRole] = useState<string>(
    application.confirmed_role ?? application.desired_role,
  );
  const [notes, setNotes] = useState<string>(latestStepTransaction?.notes ?? '');
  const [ccfVmtId, setCcfVmtId] = useState<string>(application.ccf_vmt_id ?? '');
  const [ccfVmtDate, setCcfVmtDate] = useState<string>(application.ccf_vmt_date ?? '');
  const [rfidTag, setRfidTag] = useState<string>(application.assigned_rfid_member_id ?? '');
  const [serviceCommitmentsLocal, setServiceCommitmentsLocal] = useState<ApplicantCommitments>(
    application.service_commitments ?? {},
  );

  const handleToggleSundaySlot = (
    sundayKey: keyof ApplicantCommitments,
    slot: RecruitmentServiceSlot,
    checked?: boolean,
  ) => {
    setServiceCommitmentsLocal((prev) => {
      const currentSlots = prev[sundayKey] ?? [];
      const isAlreadySelected = currentSlots.includes(slot);
      const shouldInclude = checked !== undefined ? checked : !isAlreadySelected;
      if (shouldInclude === isAlreadySelected) return prev;
      const nextSlots = shouldInclude
        ? [...currentSlots, slot]
        : currentSlots.filter((s) => s !== slot);
      return {
        ...prev,
        [sundayKey]: nextSlots,
      };
    });
  };

  const hasSelectedCommitmentSlot = useMemo(() => {
    return Object.values(serviceCommitmentsLocal).some((slots) => (slots?.length ?? 0) > 0);
  }, [serviceCommitmentsLocal]);

  const stepMeta = RECRUITMENT_STEPS.find((s) => s.stepNumber === selectedStep);
  const nextStepMeta = RECRUITMENT_STEPS.find((s) => s.stepNumber === selectedStep + 1);
  const isCurrentActiveStep = application.current_step === selectedStep;
  const isCompletedStep =
    application.current_step > selectedStep || application.status === 'deployed';
  const isAllowedParallelStep = application.current_step === 2 && selectedStep === 3;
  const isActionableStep =
    application.status !== 'deployed' && (isCurrentActiveStep || isAllowedParallelStep);
  const isFutureStep = !isCompletedStep && !isActionableStep;

  const canOverrideGate =
    authState?.adminRole === 'admin' || authState?.adminRole === 'super_admin';
  const isDGroupEndorsed = endorsement?.status === 'approved';

  const missingStepDetails = useMemo(() => {
    if (selectedStep >= 2 && selectedStep <= 6) {
      const missing: string[] = [];
      if (!reviewerId?.trim() && !reviewerName?.trim()) missing.push('Assigned To');
      if (!scheduledAtLocal?.trim() && !latestStepTransaction?.scheduled_at) {
        missing.push('Session Date & Time');
      }
      if (selectedStep === 2 && !confirmedRole) {
        missing.push('Confirmed Ministry Role');
      }
      if (selectedStep === 4 && !isDGroupEndorsed && !canOverrideGate) {
        missing.push('DGroup Leader Endorsement');
      }
      const hasNotesOnRecord = currentStepNotes.length > 0 || Boolean(notes?.trim());
      if (!hasNotesOnRecord) {
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
      if (!hasSelectedCommitmentSlot) missing.push('At least one committed Sunday service slot');
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
    currentStepNotes,
    ccfVmtId,
    ccfVmtDate,
    rfidTag,
    hasSelectedCommitmentSlot,
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
    setRepeatActionKind(null);
    const tx = [...transactions]
      .filter((t) => t.step_number === stepNum)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    setReviewerId(tx?.assigned_reviewer_id ?? '');
    setReviewerName(tx?.assigned_reviewer_name ?? '');
    setSelectedReviewerUser(null);
    setPendingScheduleAction(null);
    setIsPendingCompletionConfirm(false);
    setIsPendingDeployConfirm(false);
    setScheduledAtLocal(toDatetimeLocal(tx?.completed_at ?? tx?.scheduled_at));
    setNotes(tx?.notes ?? '');
    if (stepNum === 7) {
      setCcfVmtId(application.ccf_vmt_id ?? '');
      setCcfVmtDate(application.ccf_vmt_date ?? '');
    }
    if (stepNum === 8) {
      setRfidTag(application.assigned_rfid_member_id ?? '');
      setServiceCommitmentsLocal(application.service_commitments ?? {});
    }
  };

  const handleInitiateRepeat = (
    action: 'repeat_step' | 'return_to_interview' | 'return_to_observation',
  ) => {
    setRepeatActionKind(action);
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
        applicant_visible_notes: null,
        ccf_vmt_id: ccfVmtId.trim() || null,
        ccf_vmt_date: ccfVmtDate || null,
        assigned_rfid_member_id: rfidTag.trim() || null,
        service_commitments: selectedStep === 8 ? serviceCommitmentsLocal : undefined,
      },
      {
        onSuccess: (data) => {
          setPendingScheduleAction(null);
          setRepeatActionKind(null);
          setIsPendingCompletionConfirm(false);
          setIsPendingDeployConfirm(false);
          if (status === 'completed' && data?.current_step) {
            handleStepSelect(data.current_step as RecruitmentStepNumber);
          }
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

  const requestScheduleConfirmation = (
    action:
      | 'update_stage'
      | 'repeat_step'
      | 'return_to_observation'
      | 'return_to_interview' = 'update_stage',
  ) => {
    let actionKind: ScheduleActionKind = 'schedule';
    if (action === 'repeat_step') {
      actionKind = 'repeat_step';
    } else if (action === 'return_to_interview') {
      actionKind = 'return_to_interview';
    } else if (action === 'return_to_observation') {
      actionKind = 'return_to_observation';
    } else if (latestStepTransaction?.scheduled_at) {
      actionKind = 'reschedule';
    }

    setPendingScheduleAction({
      status: 'scheduled',
      action,
      actionKind,
    });
  };

  const handleConfirmSchedule = () => {
    if (!pendingScheduleAction) return;
    handleUpdateStage(pendingScheduleAction.status, pendingScheduleAction.action);
  };

  const handleDeploy = () => {
    deployMutation.mutate(application.id, {
      onSuccess: () => {
        setIsPendingDeployConfirm(false);
        toast.success(`Successfully deployed ${application.full_name} to Welcome Center!`);
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to deploy volunteer');
      },
    });
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

      {/* Parallel step notice banner */}
      {isAllowedParallelStep && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-xl border border-border bg-surface p-3 text-xs text-text">
          <div>
            <strong>Parallel Stage: Step 3 ({stepMeta?.title ?? 'Orientation'})</strong>
            <p className="text-muted text-[11px]">
              Orientation can be scheduled in parallel while completing the Step 2 interview.
            </p>
          </div>
          <Button
            type="button"
            size="xs"
            variant="primaryOutline"
            className="w-full sm:w-auto shrink-0"
            onClick={() => handleStepSelect(application.current_step)}
          >
            Back to Active Step ({application.current_step})
          </Button>
        </div>
      )}

      {/* Step Content Area */}
      <div className="space-y-4 px-0.5 pt-1 pb-1">
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
            <div className="space-y-2.5 text-xs text-text py-1">
              <p>
                <strong>Application Submitted:</strong> {formatDateTime(application.created_at)}
              </p>
              <p>
                <strong>DGroup Leader:</strong> {application.dgroup_info.leader_name} (
                {application.dgroup_info.leader_email})
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <strong>DGroup Endorsement Status:</strong>
                {endorsement?.status === 'approved' ? (
                  <Badge variant="default">Endorsed & Linked</Badge>
                ) : endorsement?.status === 'rejected' ? (
                  <Badge variant="destructive">Declined by Leader</Badge>
                ) : (
                  <Badge variant="secondary">Pending Leader Endorsement</Badge>
                )}
              </div>
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
                  <div className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5">
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
                          className="rounded-lg border border-border/60 bg-surface p-2.5 text-xs space-y-1.5"
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
                            Previous session details have been cleared. Select a coach and Sunday
                            date & time below.
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
                      label={
                        isCompletedStep ? 'Session / Completion Date & Time' : 'Session Date & Time'
                      }
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
                              Assign a coach and select a Sunday date & time above to schedule this
                              retake.
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
                              Assign a coach and select a Sunday date & time above to schedule this
                              session.
                            </span>
                          )}
                        </div>
                        {repeatActionKind ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => requestScheduleConfirmation(repeatActionKind)}
                            disabled={
                              updateStageMutation.isPending ||
                              !scheduledAtLocal ||
                              (!reviewerId && !reviewerName)
                            }
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
                            onClick={() => requestScheduleConfirmation('update_stage')}
                            disabled={
                              updateStageMutation.isPending ||
                              !scheduledAtLocal ||
                              (!reviewerId && !reviewerName)
                            }
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

                  {/* Recruiter Notes Thread */}
                  <StepRecruiterNotesThread
                    applicationId={application.id}
                    stepNumber={selectedStep}
                    stepTitle={stepMeta?.title ?? `Step ${selectedStep}`}
                    notes={currentStepNotes}
                    isCompletedStep={isCompletedStep}
                  />
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
                          onClick={() => setIsPendingCompletionConfirm(true)}
                          disabled={updateStageMutation.isPending || !canCompleteCurrentStep}
                          className="font-semibold"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Complete Step {selectedStep}
                        </Button>
                      </div>
                    </div>

                    {/* Additional Evaluation / Retake Controls */}
                    {(selectedStep === 2 ||
                      selectedStep === 3 ||
                      selectedStep === 4 ||
                      selectedStep === 5) && (
                      <div className="pt-2.5 border-t border-border/70 space-y-2">
                        <div>
                          <div className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                            Requires Additional Evaluation
                          </div>
                          <p className="text-[11px] text-muted">
                            If the candidate needs another round before passing this stage, schedule
                            a retake or return session below.
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 [&>button]:w-full sm:[&>button]:w-auto">
                          {/* Repeatable interview controls */}
                          {selectedStep === 2 &&
                            (repeatActionKind === 'repeat_step' ? (
                              <>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => requestScheduleConfirmation('repeat_step')}
                                  disabled={
                                    updateStageMutation.isPending ||
                                    !scheduledAtLocal ||
                                    (!reviewerId && !reviewerName)
                                  }
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
                                disabled={updateStageMutation.isPending}
                              >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                Repeat Interview (Step 2)
                              </Button>
                            ))}

                          {/* Return to Step 2 from Step 3 Orientation */}
                          {selectedStep === 3 &&
                            (repeatActionKind === 'return_to_interview' ? (
                              <>
                                <Button
                                  type="button"
                                  variant="primaryOutline"
                                  size="sm"
                                  onClick={() => requestScheduleConfirmation('return_to_interview')}
                                  disabled={
                                    updateStageMutation.isPending ||
                                    !scheduledAtLocal ||
                                    (!reviewerId && !reviewerName)
                                  }
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
                                disabled={updateStageMutation.isPending}
                              >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                Needs Another Interview (Return to Step 2)
                              </Button>
                            ))}

                          {/* Repeatable observation controls */}
                          {selectedStep === 4 &&
                            (repeatActionKind === 'repeat_step' ? (
                              <>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => requestScheduleConfirmation('repeat_step')}
                                  disabled={
                                    updateStageMutation.isPending ||
                                    !scheduledAtLocal ||
                                    (!reviewerId && !reviewerName)
                                  }
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
                                disabled={updateStageMutation.isPending}
                              >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                Repeat Observation (Step 4)
                              </Button>
                            ))}

                          {/* Repeatable evaluation controls */}
                          {selectedStep === 5 && (
                            <>
                              {repeatActionKind === 'repeat_step' ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => requestScheduleConfirmation('repeat_step')}
                                    disabled={
                                      updateStageMutation.isPending ||
                                      !scheduledAtLocal ||
                                      (!reviewerId && !reviewerName)
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
                                  disabled={updateStageMutation.isPending}
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
                                      requestScheduleConfirmation('return_to_observation')
                                    }
                                    disabled={
                                      updateStageMutation.isPending ||
                                      !scheduledAtLocal ||
                                      (!reviewerId && !reviewerName)
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
                                  disabled={updateStageMutation.isPending}
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

                <div className="text-xs">
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
                  <div className="border-t border-border pt-3.5">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setIsPendingCompletionConfirm(true)}
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

                <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-heading text-sm font-bold text-text">
                        Sunday Availability
                      </h4>
                      <p className="text-[11px] text-muted">
                        Manage member availability across all five Sundays.
                      </p>
                    </div>
                    {!hasSelectedCommitmentSlot ? (
                      <Badge variant="destructive">Required</Badge>
                    ) : (
                      <Badge variant="outline">
                        {isCompletedStep ? 'Completed' : 'Configured'}
                      </Badge>
                    )}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <SundayAvailabilityTable
                      value={serviceCommitmentsLocal}
                      onChange={
                        isCompletedStep
                          ? undefined
                          : (sundayKey, timeSlot, checked) => {
                              handleToggleSundaySlot(sundayKey, timeSlot, checked);
                            }
                      }
                      disabled={isCompletedStep}
                      readOnly={isCompletedStep}
                    />
                  </div>
                </div>

                <FormInputField
                  id="rfid-tag"
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
                  <div className="border-t border-border pt-3.5">
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => setIsPendingCompletionConfirm(true)}
                      disabled={updateStageMutation.isPending || !canCompleteCurrentStep}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Save Commitments, Assign RFID & Complete Step 8
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
                <div className="text-xs space-y-2">
                  <div className="space-y-1">
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

                  <div className="space-y-2 rounded-xl border border-border bg-surface p-3.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-heading text-sm font-bold text-text">
                          Sunday Availability
                        </h5>
                        <p className="text-[11px] text-muted">
                          Committed volunteer schedule for deployment.
                        </p>
                      </div>
                      <Badge variant="outline">Confirmed</Badge>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <SundayAvailabilityTable
                        value={application.service_commitments ?? serviceCommitmentsLocal}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {application.status !== 'deployed' && (
                  <div className="border-t border-border pt-3.5">
                    {canDeploy ? (
                      <Button
                        type="button"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => setIsPendingDeployConfirm(true)}
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

      {pendingScheduleAction && (
        <ScheduleSessionConfirmDialog
          isOpen={Boolean(pendingScheduleAction)}
          onClose={() => setPendingScheduleAction(null)}
          onConfirm={handleConfirmSchedule}
          isPending={updateStageMutation.isPending}
          applicant={{
            name: `${application.full_name}${application.nickname ? ` (${application.nickname})` : ''}`,
            email: application.email,
            phone: application.phone || undefined,
            avatarObjectKey: application.avatar_object_key,
          }}
          stepNumber={selectedStep}
          stepTitle={stepMeta?.title ?? `Step ${selectedStep}`}
          actionKind={pendingScheduleAction.actionKind}
          scheduledAt={scheduledAtLocal}
          reviewer={
            selectedReviewerUser
              ? {
                  id: selectedReviewerUser.id,
                  name: selectedReviewerUser.name,
                  role: selectedReviewerUser.role,
                  avatarObjectKey: selectedReviewerUser.avatar_object_key,
                }
              : reviewerName
                ? {
                    id: reviewerId,
                    name: reviewerName,
                  }
                : null
          }
          assignedRole={
            selectedStep === 2 ? confirmedRole || application.confirmed_role : undefined
          }
          recruitmentNotes={notes || currentStepNotes[currentStepNotes.length - 1]?.content}
        />
      )}

      {isPendingCompletionConfirm && (
        <CompleteStepConfirmDialog
          isOpen={isPendingCompletionConfirm}
          onClose={() => setIsPendingCompletionConfirm(false)}
          onConfirm={() => handleUpdateStage('completed')}
          isPending={updateStageMutation.isPending}
          applicant={{
            name: `${application.full_name}${application.nickname ? ` (${application.nickname})` : ''}`,
            email: application.email,
            phone: application.phone || undefined,
            avatarObjectKey: application.avatar_object_key,
          }}
          stepNumber={selectedStep}
          currentStepTitle={stepMeta?.title ?? `Step ${selectedStep}`}
          nextStepTitle={nextStepMeta?.title}
          completedAt={scheduledAtLocal}
          reviewer={
            selectedReviewerUser
              ? {
                  id: selectedReviewerUser.id,
                  name: selectedReviewerUser.name,
                  role: selectedReviewerUser.role,
                  avatarObjectKey: selectedReviewerUser.avatar_object_key,
                }
              : reviewerName
                ? {
                    id: reviewerId,
                    name: reviewerName,
                  }
                : null
          }
          assignedRole={
            selectedStep === 2 ? confirmedRole || application.confirmed_role : undefined
          }
          recruitmentNotes={notes || currentStepNotes[currentStepNotes.length - 1]?.content}
          ccfVmtId={ccfVmtId || application.ccf_vmt_id}
          ccfVmtDate={ccfVmtDate || application.ccf_vmt_date}
          rfidTag={rfidTag || application.assigned_rfid_member_id}
          serviceCommitments={serviceCommitmentsLocal}
        />
      )}

      {isPendingDeployConfirm && (
        <CompleteStepConfirmDialog
          isOpen={isPendingDeployConfirm}
          onClose={() => setIsPendingDeployConfirm(false)}
          onConfirm={handleDeploy}
          isPending={deployMutation.isPending}
          isDeployAction
          applicant={{
            name: `${application.full_name}${application.nickname ? ` (${application.nickname})` : ''}`,
            email: application.email,
            phone: application.phone || undefined,
            avatarObjectKey: application.avatar_object_key,
          }}
          stepNumber={9}
          currentStepTitle="Final Deployment"
          assignedRole={confirmedRole || application.confirmed_role}
          rfidTag={application.assigned_rfid_member_id}
          serviceCommitments={application.service_commitments ?? serviceCommitmentsLocal}
        />
      )}
    </div>
  );
}
