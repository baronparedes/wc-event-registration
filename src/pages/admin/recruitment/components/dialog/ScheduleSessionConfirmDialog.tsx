import { Briefcase, Calendar, FileText, User } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { formatDisplayDateTime, parseDateTimeParts } from '@/components/ui/sundayDateTimeUtils';

export type ScheduleActionKind =
  | 'schedule'
  | 'reschedule'
  | 'repeat_step'
  | 'return_to_interview'
  | 'return_to_observation';

export interface ScheduleSessionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  applicant: {
    name: string;
    email: string;
    phone?: string;
    avatarObjectKey?: string | null;
  };
  stepNumber: number;
  stepTitle: string;
  actionKind: ScheduleActionKind;
  scheduledAt: string;
  reviewer?: {
    id: string;
    name: string;
    role?: string | null;
    avatarObjectKey?: string | null;
  } | null;
  assignedRole?: string | null;
  recruitmentNotes?: string;
}

function getActionMeta(actionKind: ScheduleActionKind, stepNumber: number) {
  switch (actionKind) {
    case 'reschedule':
      return {
        title: 'Confirm Session Reschedule',
        badge: 'Reschedule',
        buttonText: 'Confirm & Reschedule',
        description: 'Verify the updated session schedule and reviewer assignment.',
      };
    case 'repeat_step': {
      const stepName =
        stepNumber === 2
          ? 'Re-Interview'
          : stepNumber === 3
            ? 'Re-Orientation'
            : stepNumber === 4
              ? 'Re-Observation'
              : 'Re-Service';
      return {
        title: `Confirm ${stepName} Schedule`,
        badge: 'Repeat / Re-evaluation',
        buttonText: `Confirm & Schedule ${stepName}`,
        description:
          'A new attempt session will be scheduled while preserving candidate pipeline history.',
      };
    }
    case 'return_to_interview':
      return {
        title: 'Confirm Return to Interview Schedule',
        badge: 'Return to Step 2',
        buttonText: 'Confirm & Return to Interview',
        description:
          'The candidate will be returned to Step 2 (Interview) with this scheduled session.',
      };
    case 'return_to_observation':
      return {
        title: 'Confirm Return to Observation Schedule',
        badge: 'Return to Step 4',
        buttonText: 'Confirm & Return to Observation',
        description:
          'The candidate will be returned to Step 4 (Observation) with this scheduled session.',
      };
    case 'schedule':
    default:
      return {
        title: 'Confirm Session Schedule',
        badge: 'New Session',
        buttonText: 'Confirm & Schedule',
        description: 'Review the session schedule and reviewer details before saving.',
      };
  }
}

export function ScheduleSessionConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  applicant,
  stepNumber,
  stepTitle,
  actionKind,
  scheduledAt,
  reviewer,
  assignedRole,
  recruitmentNotes,
}: ScheduleSessionConfirmDialogProps) {
  const actionMeta = getActionMeta(actionKind, stepNumber);
  const { datePart, timePart } = parseDateTimeParts(scheduledAt);
  const formattedDateTime = datePart ? formatDisplayDateTime(datePart, timePart) : '';

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
        <Dialog.Title>{actionMeta.title}</Dialog.Title>
        <Dialog.Description className="mt-1 text-xs text-muted">
          {actionMeta.description}
        </Dialog.Description>
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

        {/* Schedule & Reviewer Specifications */}
        <div className="rounded-xl border border-border bg-background p-3.5 space-y-2.5">
          {/* Target Stage & Action */}
          <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2">
            <span className="text-muted font-medium">Recruitment Stage</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-text">{stepTitle}</span>
              <Badge variant="accent" className="text-[10px]">
                {actionMeta.badge}
              </Badge>
            </div>
          </div>

          {/* Session Date & Time */}
          <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 text-muted font-medium">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>Session Date & Time</span>
            </div>
            <span className="font-bold text-text text-xs sm:text-sm">
              {formattedDateTime ||
                (actionKind === 'return_to_observation'
                  ? 'To be scheduled in Step 4'
                  : actionKind === 'return_to_interview'
                    ? 'To be scheduled in Step 2'
                    : 'No date set')}
            </span>
          </div>

          {/* Assigned Reviewer / Coach */}
          <div className="flex items-center justify-between text-xs border-b border-border/60 pb-2">
            <div className="flex items-center gap-1.5 text-muted font-medium">
              <User className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
              <span>Assigned Reviewer / Coach</span>
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
                      <Badge variant="outline" className="text-[10px] py-0 px-1">
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

          {/* Assigned Ministry Role (Step 2) */}
          {assignedRole && (
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted font-medium">
                <Briefcase className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                <span>Assigned Ministry Role</span>
              </div>
              <Badge variant="default" className="text-[10px]">
                {assignedRole}
              </Badge>
            </div>
          )}
        </div>

        {/* Recruitment Notes Preview */}
        {recruitmentNotes?.trim() && (
          <div className="rounded-xl border border-border bg-surface p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-muted">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Recruitment Notes</span>
            </div>
            <p className="text-text whitespace-pre-wrap pl-5">{recruitmentNotes.trim()}</p>
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
              Scheduling...
            </>
          ) : (
            actionMeta.buttonText
          )}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
