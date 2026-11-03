import { useState } from 'react';

import { CheckCircle2, Clock, History, RotateCcw, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  Badge,
  Button,
  FormInputField,
  FormSelectField,
  FormTextareaField,
  Spinner,
} from '@/components/ui';
import { useAdminAuthQuery, useApproverUsersQuery } from '@/hooks/domain/auth';
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

interface PipelineStepsPanelProps {
  application: RecruitmentApplication;
  transactions: RecruitmentPipelineTransaction[];
}

export function PipelineStepsPanel({ application, transactions }: PipelineStepsPanelProps) {
  const [selectedStep, setSelectedStep] = useState<RecruitmentStepNumber>(application.current_step);
  const { data: approvers } = useApproverUsersQuery();
  const { data: authState, can } = useAdminAuthQuery();
  const canWrite = can('canWriteAdminData');

  const updateStageMutation = useUpdateRecruitmentStageMutation();
  const deployMutation = useDeployRecruitmentApplicantMutation();

  // Find latest transaction for selected step if any
  const latestStepTransaction = [...transactions]
    .reverse()
    .find((tx) => tx.step_number === selectedStep);

  // Form states for stage action
  const [reviewerId, setReviewerId] = useState<string>(
    latestStepTransaction?.assigned_reviewer_id ?? '',
  );
  const [scheduledAtLocal, setScheduledAtLocal] = useState<string>(
    toDatetimeLocal(latestStepTransaction?.scheduled_at),
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
  const canDeploy =
    canWrite &&
    (authState?.adminRole === 'admin' ||
      authState?.adminRole === 'super_admin' ||
      authState?.adminRole === 'slod');

  const approverOptions = (approvers ?? []).map((user) => ({
    label: `${user.name} (${user.role})`,
    value: user.auth_user_id,
  }));

  const roleOptions = RECRUITMENT_ROLES.map((role) => ({
    label: role,
    value: role,
  }));

  const handleUpdateStage = (
    status: 'scheduled' | 'completed' | 'in_progress',
    action: 'update_stage' | 'repeat_step' | 'return_to_observation' = 'update_stage',
  ) => {
    const assignedReviewer = approvers?.find((u) => u.auth_user_id === reviewerId);
    const isoScheduledAt = localDateTimeToUTC8ISO(scheduledAtLocal);

    updateStageMutation.mutate(
      {
        action,
        application_id: application.id,
        step_number: selectedStep,
        status,
        scheduled_at: isoScheduledAt,
        assigned_reviewer_id: reviewerId || null,
        assigned_reviewer_name: assignedReviewer?.name || null,
        confirmed_role: confirmedRole ? (confirmedRole as RecruitmentRole) : undefined,
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

  return (
    <div className="space-y-6">
      {/* Step Selector Pills */}
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-center gap-1.5">
          {RECRUITMENT_STEPS.map((s) => {
            const isCurrent = application.current_step === s.stepNumber;
            const isCompleted =
              application.current_step > s.stepNumber || application.status === 'deployed';
            const isSelected = selectedStep === s.stepNumber;

            return (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => {
                  setSelectedStep(s.stepNumber);
                  const tx = [...transactions]
                    .reverse()
                    .find((t) => t.step_number === s.stepNumber);
                  setReviewerId(tx?.assigned_reviewer_id ?? '');
                  setScheduledAtLocal(toDatetimeLocal(tx?.scheduled_at));
                  setNotes(tx?.notes ?? '');
                  setApplicantNotes(tx?.applicant_visible_notes ?? '');
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : isCompleted
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : isCurrent
                        ? 'border border-primary text-text'
                        : 'border border-border text-muted hover:text-text'
                }`}
              >
                <span>{s.stepNumber}.</span>
                <span>{s.shortLabel}</span>
                {isCompleted && <CheckCircle2 className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Step Header & Active Controls */}
      <div className="space-y-5 rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                Step {selectedStep}
              </Badge>
              <h3 className="font-heading text-base font-bold text-text">{stepMeta?.title}</h3>
            </div>
            <p className="mt-1 text-xs text-muted">{stepMeta?.description}</p>
          </div>

          <Badge
            variant={
              application.current_step > selectedStep || application.status === 'deployed'
                ? 'default'
                : application.current_step === selectedStep
                  ? 'accent'
                  : 'outline'
            }
          >
            {application.current_step > selectedStep || application.status === 'deployed'
              ? 'Completed'
              : application.current_step === selectedStep
                ? 'Current Step'
                : 'Upcoming'}
          </Badge>
        </div>

        {/* Step-specific content */}
        {selectedStep === 1 && (
          <div className="space-y-3 text-xs text-text">
            <p>
              <strong>Started:</strong> {formatDateTime(application.created_at)}
            </p>
            <p>
              <strong>DGroup Leader:</strong> {application.dgroup_info.leader_name} (
              {application.dgroup_info.leader_email})
            </p>
            <p>
              <strong>DGroup Endorsement Status:</strong>{' '}
              {application.dgroup_approval_id ? 'Linked & Endorsed' : 'Pending Leader Review'}
            </p>
          </div>
        )}

        {selectedStep >= 2 && selectedStep <= 6 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelectField
                label="Assigned Reviewer / Coach"
                placeholder=""
                value={reviewerId}
                onChange={(val) => setReviewerId(val)}
                options={[{ label: 'Unassigned', value: '' }, ...approverOptions]}
              />

              <FormInputField
                label="Scheduled Session Date & Time"
                type="datetime-local"
                value={scheduledAtLocal}
                onChange={(event) => setScheduledAtLocal(event.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelectField
                label="Confirmed Ministry Role"
                placeholder=""
                value={confirmedRole}
                onChange={(val) => setConfirmedRole(val)}
                options={roleOptions}
                helperText="Prayer Coach role requires Step 6 Usher onboarding; other roles advance directly to Step 7."
              />

              <FormTextareaField
                label="Applicant-Visible Notes"
                placeholder="Instructions or preparation notes shown to the applicant on their progress portal..."
                rows={2}
                textareaClassName="resize-none"
                value={applicantNotes}
                onChange={(event) => setApplicantNotes(event.target.value)}
              />
            </div>

            <FormTextareaField
              label="Internal Coaching Notes & Rubric"
              placeholder="Private evaluation feedback and notes for ministry leadership..."
              rows={3}
              textareaClassName="resize-none"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="button"
                variant="primaryOutline"
                size="sm"
                onClick={() => handleUpdateStage('scheduled')}
                disabled={updateStageMutation.isPending}
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                Schedule Session
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleUpdateStage('completed')}
                disabled={updateStageMutation.isPending}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Complete Step {selectedStep}
              </Button>

              {/* Repeatable observation controls */}
              {selectedStep === 4 && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUpdateStage('scheduled', 'repeat_step')}
                  disabled={updateStageMutation.isPending}
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
                    disabled={updateStageMutation.isPending}
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

        {selectedStep === 7 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4 text-xs text-text">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInputField
                label="CCF VMT ID"
                placeholder="e.g. VMT-12345"
                value={ccfVmtId}
                onChange={(event) => setCcfVmtId(event.target.value)}
              />

              <FormInputField
                label="CCF VMT Registration Date"
                type="date"
                value={ccfVmtDate}
                onChange={(event) => setCcfVmtDate(event.target.value)}
              />
            </div>

            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => handleUpdateStage('completed')}
                disabled={updateStageMutation.isPending}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Verify & Complete Step 7
              </Button>
            </div>
          </div>
        )}

        {selectedStep === 8 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4 text-xs">
              <h4 className="font-semibold text-text">Selected Sunday Commitments:</h4>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {Object.entries(application.service_commitments ?? {}).map(([key, slots]) => (
                  <div key={key} className="text-muted">
                    <span className="capitalize">{key.replace('_', ' ')}:</span>{' '}
                    <span className="font-semibold text-text">{slots?.join(', ') || 'None'}</span>
                  </div>
                ))}
              </div>
            </div>

            <FormInputField
              label="Assigned Physical RFID Tag (Member ID)"
              placeholder="e.g. 1000123"
              value={rfidTag}
              onChange={(event) => setRfidTag(event.target.value)}
              helperText="Physical RFID tag number scanned or assigned to this volunteer."
            />

            <div className="pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => handleUpdateStage('completed')}
                disabled={updateStageMutation.isPending || !rfidTag.trim()}
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                Assign RFID & Complete Step 8
              </Button>
            </div>
          </div>
        )}

        {selectedStep === 9 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-2">
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
              <div>
                {canDeploy ? (
                  <Button
                    type="button"
                    size="sm"
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
                    Final Step 9 Deployment to active Welcome Center member is reserved for Admins
                    and SLODs.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction History Feed */}
      <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2 border-b border-border pb-2.5">
          <History className="h-4 w-4 text-muted" />
          <h4 className="font-heading text-sm font-bold text-text">Pipeline Transaction History</h4>
          <Badge variant="outline" className="font-mono text-xs">
            {transactions.length}
          </Badge>
        </div>

        {transactions.length === 0 ? (
          <p className="text-xs text-muted">No session transactions recorded yet.</p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
            {[...transactions].reverse().map((tx) => (
              <div
                key={tx.id}
                className="rounded-xl border border-border/60 bg-background p-3 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Step {tx.step_number}
                    </Badge>
                    <span className="font-semibold text-text">
                      Attempt #{tx.attempt_number} ({tx.transaction_type.replace('_', ' ')})
                    </span>
                  </div>
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {tx.status}
                  </Badge>
                </div>

                {tx.scheduled_at && (
                  <p className="text-muted">
                    Scheduled: <span className="text-text">{formatDateTime(tx.scheduled_at)}</span>
                  </p>
                )}

                {tx.assigned_reviewer_name && (
                  <p className="text-muted">
                    Reviewer: <span className="text-text">{tx.assigned_reviewer_name}</span>
                  </p>
                )}

                {tx.notes && (
                  <p className="text-muted">
                    Internal Note: <span className="italic text-text">{tx.notes}</span>
                  </p>
                )}

                <p className="text-[10px] text-muted text-right">
                  Logged on {formatDateTime(tx.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
