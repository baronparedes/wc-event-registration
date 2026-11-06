import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  User,
  UserCheck,
} from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { formatDisplayDateTime, parseDateTimeParts } from '@/components/ui/sundayDateTimeUtils';
import type { ApplicantCommitments } from '@/lib/domain/recruitment';

const SUNDAYS = [
  ['first_sunday', '1st Sunday'],
  ['second_sunday', '2nd Sunday'],
  ['third_sunday', '3rd Sunday'],
  ['fourth_sunday', '4th Sunday'],
  ['fifth_sunday', '5th Sunday'],
] as const;

export interface CompleteStepConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isDeployAction?: boolean;
  applicant: {
    name: string;
    email: string;
    phone?: string;
    avatarObjectKey?: string | null;
  };
  stepNumber: number;
  currentStepTitle: string;
  nextStepTitle?: string;
  completedAt?: string;
  reviewer?: {
    id: string;
    name: string;
    role?: string | null;
    avatarObjectKey?: string | null;
  } | null;
  assignedRole?: string | null;
  recruitmentNotes?: string;
  ccfVmtId?: string | null;
  ccfVmtDate?: string | null;
  rfidTag?: string | null;
  serviceCommitments?: ApplicantCommitments | null;
}

export function CompleteStepConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  isDeployAction = false,
  applicant,
  stepNumber,
  currentStepTitle,
  nextStepTitle,
  completedAt,
  reviewer,
  assignedRole,
  recruitmentNotes,
  ccfVmtId,
  ccfVmtDate,
  rfidTag,
  serviceCommitments,
}: CompleteStepConfirmDialogProps) {
  const { datePart, timePart } = parseDateTimeParts(completedAt);
  const formattedDateTime = datePart ? formatDisplayDateTime(datePart, timePart) : '';

  const title = isDeployAction
    ? 'Confirm Volunteer Deployment'
    : `Confirm Step ${stepNumber} Completion`;

  const description = isDeployAction
    ? 'The candidate will be finalized and deployed as an active volunteer in the Welcome Center directory.'
    : 'Verify all step requirements, evaluations, and recorded information before advancing the pipeline.';

  const confirmButtonText = isDeployAction
    ? 'Confirm & Deploy Volunteer'
    : `Confirm & Complete Step ${stepNumber}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      role="dialog"
      closeOnEscape={!isPending}
      closeOnBackdropClick={!isPending}
    >
      <Dialog.Header showCloseButton onClose={onClose}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted">{description}</Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="space-y-3.5">
        {/* Candidate Profile Summary */}
        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-background p-3.5">
          <Avatar
            avatarObjectKey={applicant.avatarObjectKey}
            name={applicant.name}
            size="md"
            className="shrink-0 border-2 border-border/80 shadow-2xs"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-bold text-text truncate">{applicant.name}</h4>
              <Badge variant="secondary">Step {stepNumber}</Badge>
            </div>
            <p className="text-xs text-muted truncate mt-0.5">
              {applicant.email}
              {applicant.phone ? ` · ${applicant.phone}` : ''}
            </p>
          </div>
        </div>

        {/* Pipeline Advancement Banner */}
        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/[0.04] p-3 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <Badge variant="outline" className="border-primary/40 text-primary shrink-0">
              Step {stepNumber}
            </Badge>
            <span className="font-semibold text-text truncate">{currentStepTitle}</span>
          </div>

          <ArrowRight className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />

          <div className="flex items-center gap-1.5 min-w-0">
            <Badge variant="default" className="shrink-0">
              {isDeployAction ? 'Active' : `Next: Step ${stepNumber + 1}`}
            </Badge>
            <span className="font-semibold text-text truncate">
              {isDeployAction ? 'Welcome Center Volunteer' : nextStepTitle || 'Next Stage'}
            </span>
          </div>
        </div>

        {/* Steps 2-6: Coaching, Observation & Evaluation Session Details */}
        {stepNumber >= 2 && stepNumber <= 6 && (
          <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 text-xs">
            {/* Completion Date & Time */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-1.5 text-muted font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>Completion / Session Date</span>
              </div>
              <span className="font-bold text-text">
                {formattedDateTime || 'Recorded at completion'}
              </span>
            </div>

            {/* Evaluator / Reviewer */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-1.5 text-muted font-medium">
                <User className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>Signed-Off Reviewer / Coach</span>
              </div>
              <div className="flex items-center gap-2">
                {reviewer ? (
                  <>
                    <Avatar
                      avatarObjectKey={reviewer.avatarObjectKey}
                      name={reviewer.name}
                      size="sm"
                      className="shrink-0 border border-border/80 shadow-2xs"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-text">{reviewer.name}</span>
                      {reviewer.role && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                          {reviewer.role}
                        </Badge>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-muted italic">Unassigned</span>
                )}
              </div>
            </div>

            {/* Confirmed Ministry Role (Step 2) */}
            {assignedRole && (
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-1.5 text-muted font-medium">
                  <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span>Confirmed Ministry Role</span>
                </div>
                <Badge variant="default" className="text-[10px]">
                  {assignedRole}
                </Badge>
              </div>
            )}

            {/* Recruitment Notes */}
            {recruitmentNotes?.trim() && (
              <div className="space-y-1 pt-0.5">
                <div className="flex items-center gap-1.5 font-semibold text-muted">
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Evaluation & Coaching Notes</span>
                </div>
                <p className="rounded-lg border border-border bg-surface p-2 text-text whitespace-pre-wrap">
                  {recruitmentNotes.trim()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 7: VMT Registration Details */}
        {stepNumber === 7 && (
          <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center gap-1.5 text-muted font-medium">
                <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>CCF VMT ID</span>
              </div>
              <span className="font-bold font-mono text-text">{ccfVmtId || 'None'}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted font-medium">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>CCF VMT Registration Date</span>
              </div>
              <span className="font-semibold text-text">{ccfVmtDate || 'None'}</span>
            </div>
          </div>
        )}

        {/* Step 8: RFID Assignment Details */}
        {stepNumber === 8 && (
          <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted font-medium">
                <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>Assigned RFID Tag (Member ID)</span>
              </div>
              <span className="font-bold font-mono text-text bg-surface px-2 py-0.5 rounded border border-border">
                {rfidTag || 'None'}
              </span>
            </div>

            {serviceCommitments && (
              <div className="border-t border-border/60 pt-2 space-y-1.5">
                <div className="flex items-center gap-1.5 text-muted font-medium">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                  <span>Committed Sunday Schedule</span>
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {SUNDAYS.map(([key, label]) => {
                    const slots = serviceCommitments[key as keyof ApplicantCommitments] ?? [];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded border border-border/60 bg-surface px-2 py-1 text-[11px]"
                      >
                        <span className="text-muted">{label}</span>
                        <span className="font-semibold text-text">
                          {slots.length > 0 ? slots.join(', ') : 'None'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 9: Final Deployment Details */}
        {isDeployAction && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5 text-xs">
              {assignedRole && (
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 text-muted font-medium">
                    <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>Deployed Ministry Role</span>
                  </div>
                  <Badge variant="default" className="text-[10px]">
                    {assignedRole}
                  </Badge>
                </div>
              )}

              {rfidTag && (
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5 text-muted font-medium">
                    <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>Member RFID / ID</span>
                  </div>
                  <span className="font-bold font-mono text-text">{rfidTag}</span>
                </div>
              )}

              {serviceCommitments && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center gap-1.5 text-muted font-medium">
                    <Clock className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>Committed Sunday Schedule</span>
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {SUNDAYS.map(([key, label]) => {
                      const slots = serviceCommitments[key as keyof ApplicantCommitments] ?? [];
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded border border-border/60 bg-surface px-2 py-1 text-[11px]"
                        >
                          <span className="text-muted">{label}</span>
                          <span className="font-semibold text-text">
                            {slots.length > 0 ? slots.join(', ') : 'None'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-text">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
              <p>
                Confirming deployment will complete the recruitment pipeline and register this
                applicant as an active Welcome Center volunteer with service commitments.
              </p>
            </div>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer bordered className="mt-2">
        <Button
          type="button"
          variant="primaryOutline"
          size="md"
          onClick={onClose}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="button" variant="default" size="md" onClick={onConfirm} disabled={isPending}>
          {isPending ? (
            <>
              <Spinner size="sm" className="mr-2" aria-hidden="true" />
              {isDeployAction ? 'Deploying...' : 'Completing Step...'}
            </>
          ) : (
            confirmButtonText
          )}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
