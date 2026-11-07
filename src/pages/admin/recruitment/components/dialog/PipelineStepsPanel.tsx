import { useMemo, useState } from 'react';

import { CheckCircle2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge, Button, Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import {
  useDeployRecruitmentApplicantMutation,
  useUpdateRecruitmentStageMutation,
} from '@/hooks/domain/recruitment';
import {
  type ApplicantCommitments,
  RECRUITMENT_STEPS,
  type RecruiterNote,
  type RecruitmentApplication,
  type RecruitmentApplicationDetail,
  type RecruitmentPipelineTransaction,
  type RecruitmentRole,
  type RecruitmentStepNumber,
  type ReviewerUserItem,
} from '@/lib/domain/recruitment';
import { localDateTimeToUTC8ISO } from '@/lib/infrastructure';

import { CancelScheduleConfirmDialog } from './CancelScheduleConfirmDialog';
import { CompleteStepConfirmDialog } from './CompleteStepConfirmDialog';
import {
  type ScheduleActionKind,
  ScheduleSessionConfirmDialog,
} from './ScheduleSessionConfirmDialog';
import {
  Step1SurveyReviewPanel,
  Step7VmtRegistrationPanel,
  Step8RfidCommitmentsPanel,
  Step9DeploymentPanel,
  StepCoachingSessionPanel,
} from './steps';

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
  const navigate = useNavigate();
  const { data: authState, can } = useAdminAuthQuery();
  const canWrite = can('canWriteAdminData');

  const updateStageMutation = useUpdateRecruitmentStageMutation();
  const deployMutation = useDeployRecruitmentApplicantMutation();

  const [pendingScheduleAction, setPendingScheduleAction] = useState<{
    status: 'scheduled';
    action: 'update_stage' | 'repeat_step' | 'return_to_observation' | 'return_to_interview';
    actionKind: ScheduleActionKind;
    scheduledAt: string;
    reviewerId: string;
    reviewerName: string;
    selectedReviewerUser: ReviewerUserItem | null;
  } | null>(null);

  const [pendingCompleteOptions, setPendingCompleteOptions] = useState<{
    confirmedRole?: string;
    scheduledAt?: string;
    reviewerId?: string;
    reviewerName?: string;
    selectedReviewerUser?: ReviewerUserItem | null;
    ccfVmtId?: string;
    ccfVmtDate?: string;
    rfidTag?: string;
    serviceCommitments?: ApplicantCommitments;
  } | null>(null);

  const [isPendingDeployConfirm, setIsPendingDeployConfirm] = useState(false);
  const [isCancelScheduleOpen, setIsCancelScheduleOpen] = useState(false);

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
  const isDGroupEndorsed =
    endorsement?.status === 'approved' ||
    Boolean(application.dgroup_approval_id && endorsement?.attestation_answers);

  const canDeploy =
    isActionableStep &&
    selectedStep === 9 &&
    canWrite &&
    (authState?.adminRole === 'admin' ||
      authState?.adminRole === 'super_admin' ||
      authState?.adminRole === 'slod');

  const handleStepSelect = (stepNum: RecruitmentStepNumber) => {
    setSelectedStep(stepNum);
    setPendingScheduleAction(null);
    setPendingCompleteOptions(null);
    setIsPendingDeployConfirm(false);
  };

  const handleExecuteUpdateStage = (
    status: 'scheduled' | 'completed' | 'in_progress',
    action:
      | 'update_stage'
      | 'repeat_step'
      | 'return_to_observation'
      | 'return_to_interview' = 'update_stage',
    overrides?: {
      scheduledAt?: string;
      reviewerId?: string;
      reviewerName?: string;
      confirmedRole?: string;
      ccfVmtId?: string;
      ccfVmtDate?: string;
      rfidTag?: string;
      serviceCommitments?: ApplicantCommitments;
      notes?: string;
    },
  ) => {
    const rawScheduledAt = overrides?.scheduledAt;
    const isoScheduledAt = rawScheduledAt?.trim() ? localDateTimeToUTC8ISO(rawScheduledAt) : null;

    const effectiveConfirmedRole =
      selectedStep === 2
        ? ((overrides?.confirmedRole ||
            application.confirmed_role ||
            application.desired_role) as RecruitmentRole)
        : application.confirmed_role
          ? undefined
          : overrides?.confirmedRole
            ? (overrides.confirmedRole as RecruitmentRole)
            : undefined;

    updateStageMutation.mutate(
      {
        action,
        application_id: application.id,
        step_number: selectedStep,
        status,
        scheduled_at: isoScheduledAt,
        assigned_reviewer_id: overrides?.reviewerId || null,
        assigned_reviewer_name: overrides?.reviewerName || null,
        confirmed_role: effectiveConfirmedRole,
        ccf_vmt_id: overrides?.ccfVmtId?.trim() || null,
        ccf_vmt_date: overrides?.ccfVmtDate || null,
        assigned_rfid_member_id: overrides?.rfidTag?.trim() || null,
        service_commitments: selectedStep === 8 ? overrides?.serviceCommitments : undefined,
        notes: overrides?.notes?.trim() || null,
      },
      {
        onSuccess: (data) => {
          setPendingScheduleAction(null);
          setPendingCompleteOptions(null);
          setIsPendingDeployConfirm(false);
          if (data?.current_step) {
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

  const handleConfirmSchedule = () => {
    if (!pendingScheduleAction) return;
    handleExecuteUpdateStage(pendingScheduleAction.status, pendingScheduleAction.action, {
      scheduledAt: pendingScheduleAction.scheduledAt,
      reviewerId: pendingScheduleAction.reviewerId,
      reviewerName: pendingScheduleAction.reviewerName,
    });
  };

  const handleConfirmComplete = (completionComment?: string) => {
    handleExecuteUpdateStage('completed', 'update_stage', {
      ...pendingCompleteOptions,
      notes: completionComment?.trim() || undefined,
    });
  };

  const handleConfirmCancelSchedule = (reason: string) => {
    updateStageMutation.mutate(
      {
        action: 'cancel_schedule',
        application_id: application.id,
        step_number: selectedStep,
        notes: reason.trim(),
      },
      {
        onSuccess: () => {
          setIsCancelScheduleOpen(false);
          toast.success(`Scheduled session for Step ${selectedStep} cancelled.`);
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to cancel schedule');
        },
      },
    );
  };

  const handleDeploy = () => {
    deployMutation.mutate(application.id, {
      onSuccess: (data) => {
        setIsPendingDeployConfirm(false);
        toast.success(`Successfully deployed ${application.full_name} to Welcome Center!`);
        if (data?.user_id) {
          navigate(toRoute('adminMemberDetail', { id: data.user_id }));
        } else {
          navigate(toRoute('adminMembers'));
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Failed to deploy volunteer');
      },
    });
  };

  const stepTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.step_number === selectedStep)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [transactions, selectedStep]);

  const latestStepTransaction = stepTransactions[0];
  const currentStepNotes = useMemo(() => {
    return (stepNotes ?? []).filter((n) => n.step_number === selectedStep);
  }, [stepNotes, selectedStep]);

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
                      ? 'border-primary/80 bg-primary/10 text-primary font-semibold ring-1 ring-primary/40'
                      : isStepCompleted
                        ? 'border-transparent text-muted hover:text-text hover:bg-muted/10'
                        : 'border-transparent text-muted/60 opacity-60'
                }`}
              >
                {isStepCompleted ? (
                  <CheckCircle2
                    className={`h-4 w-4 shrink-0 ${isStepSelected ? 'text-white' : 'text-primary'}`}
                  />
                ) : isStepLocked ? (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-muted/70" />
                ) : (
                  <span
                    className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isStepSelected ? 'bg-white text-primary' : 'bg-primary text-white'
                    }`}
                  >
                    {s.stepNumber}
                  </span>
                )}
                <span>{s.shortLabel}</span>
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

        {/* Step 1: Survey & DGroup summary */}
        {selectedStep === 1 && (
          <Step1SurveyReviewPanel application={application} endorsement={endorsement} />
        )}

        {/* Steps 2 through 6: Coaching Sessions */}
        {selectedStep >= 2 && selectedStep <= 6 && (
          <StepCoachingSessionPanel
            key={selectedStep}
            stepNumber={selectedStep}
            application={application}
            transactions={transactions}
            stepNotes={stepNotes}
            isCompletedStep={isCompletedStep}
            isFutureStep={isFutureStep}
            canOverrideGate={canOverrideGate}
            isDGroupEndorsed={isDGroupEndorsed}
            isPending={updateStageMutation.isPending}
            onJumpToActive={() => handleStepSelect(application.current_step)}
            onRequestSchedule={({
              scheduledAt,
              reviewerId,
              reviewerName,
              selectedReviewerUser,
              actionKind,
            }) => {
              const action =
                actionKind === 'repeat_step'
                  ? 'repeat_step'
                  : actionKind === 'return_to_interview'
                    ? 'return_to_interview'
                    : actionKind === 'return_to_observation'
                      ? 'return_to_observation'
                      : 'update_stage';
              setPendingScheduleAction({
                status: 'scheduled',
                action,
                actionKind,
                scheduledAt,
                reviewerId,
                reviewerName,
                selectedReviewerUser,
              });
            }}
            onRequestComplete={({
              confirmedRole,
              scheduledAt,
              reviewerId,
              reviewerName,
              selectedReviewerUser,
            }) => {
              setPendingCompleteOptions({
                confirmedRole,
                scheduledAt,
                reviewerId,
                reviewerName,
                selectedReviewerUser,
              });
            }}
            onRequestCancelSchedule={() => setIsCancelScheduleOpen(true)}
          />
        )}

        {/* Step 7: CCF VMT Registration */}
        {selectedStep === 7 && (
          <Step7VmtRegistrationPanel
            key={7}
            application={application}
            isCompletedStep={isCompletedStep}
            isFutureStep={isFutureStep}
            isPending={updateStageMutation.isPending}
            onJumpToActive={() => handleStepSelect(application.current_step)}
            onRequestComplete={({ ccfVmtId, ccfVmtDate }) => {
              setPendingCompleteOptions({ ccfVmtId, ccfVmtDate });
            }}
          />
        )}

        {/* Step 8: RFID Releasing & Sunday Commitments */}
        {selectedStep === 8 && (
          <Step8RfidCommitmentsPanel
            key={8}
            application={application}
            isCompletedStep={isCompletedStep}
            isFutureStep={isFutureStep}
            isPending={updateStageMutation.isPending}
            onJumpToActive={() => handleStepSelect(application.current_step)}
            onRequestComplete={({ rfidTag, serviceCommitments }) => {
              setPendingCompleteOptions({ rfidTag, serviceCommitments });
            }}
          />
        )}

        {/* Step 9: Final Deployment Gate */}
        {selectedStep === 9 && (
          <Step9DeploymentPanel
            key={9}
            application={application}
            confirmedRole={application.confirmed_role || application.desired_role}
            isFutureStep={isFutureStep}
            canDeploy={canDeploy}
            isPendingDeploy={deployMutation.isPending}
            onJumpToActive={() => handleStepSelect(application.current_step)}
            onRequestDeploy={() => setIsPendingDeployConfirm(true)}
          />
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
          scheduledAt={pendingScheduleAction.scheduledAt}
          reviewer={
            pendingScheduleAction.selectedReviewerUser
              ? {
                  id: pendingScheduleAction.selectedReviewerUser.id,
                  name: pendingScheduleAction.selectedReviewerUser.name,
                  role: pendingScheduleAction.selectedReviewerUser.role,
                  avatarObjectKey: pendingScheduleAction.selectedReviewerUser.avatar_object_key,
                }
              : pendingScheduleAction.reviewerName
                ? {
                    id: pendingScheduleAction.reviewerId || '',
                    name: pendingScheduleAction.reviewerName,
                  }
                : null
          }
          assignedRole={selectedStep === 2 ? application.confirmed_role : undefined}
          recruitmentNotes={currentStepNotes[currentStepNotes.length - 1]?.content}
        />
      )}

      {pendingCompleteOptions && (
        <CompleteStepConfirmDialog
          isOpen={Boolean(pendingCompleteOptions)}
          onClose={() => setPendingCompleteOptions(null)}
          onConfirm={handleConfirmComplete}
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
          completedAt={
            pendingCompleteOptions.scheduledAt || latestStepTransaction?.scheduled_at || undefined
          }
          reviewer={
            pendingCompleteOptions.selectedReviewerUser
              ? {
                  id: pendingCompleteOptions.selectedReviewerUser.id,
                  name: pendingCompleteOptions.selectedReviewerUser.name,
                  role: pendingCompleteOptions.selectedReviewerUser.role,
                  avatarObjectKey: pendingCompleteOptions.selectedReviewerUser.avatar_object_key,
                }
              : pendingCompleteOptions.reviewerName
                ? {
                    id: pendingCompleteOptions.reviewerId || '',
                    name: pendingCompleteOptions.reviewerName,
                  }
                : null
          }
          assignedRole={
            selectedStep === 2
              ? pendingCompleteOptions.confirmedRole ||
                application.confirmed_role ||
                application.desired_role
              : undefined
          }
          recruitmentNotes={currentStepNotes[currentStepNotes.length - 1]?.content}
          ccfVmtId={pendingCompleteOptions.ccfVmtId || application.ccf_vmt_id}
          ccfVmtDate={pendingCompleteOptions.ccfVmtDate || application.ccf_vmt_date}
          rfidTag={pendingCompleteOptions.rfidTag || application.assigned_rfid_member_id}
          serviceCommitments={pendingCompleteOptions.serviceCommitments}
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
          assignedRole={application.confirmed_role || application.desired_role}
          rfidTag={application.assigned_rfid_member_id}
          serviceCommitments={application.service_commitments}
        />
      )}

      {isCancelScheduleOpen && (
        <CancelScheduleConfirmDialog
          isOpen={isCancelScheduleOpen}
          onClose={() => setIsCancelScheduleOpen(false)}
          onConfirm={handleConfirmCancelSchedule}
          isPending={updateStageMutation.isPending}
          applicant={{
            name: `${application.full_name}${application.nickname ? ` (${application.nickname})` : ''}`,
            email: application.email,
            phone: application.phone || undefined,
            avatarObjectKey: application.avatar_object_key,
          }}
          stepNumber={selectedStep}
          stepTitle={stepMeta?.title ?? `Step ${selectedStep}`}
          scheduledAt={latestStepTransaction?.scheduled_at}
          reviewerName={latestStepTransaction?.assigned_reviewer_name}
        />
      )}
    </div>
  );
}
