import { useState } from 'react';

import { CalendarX, Clock, UserCheck } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormTextareaField } from '@/components/ui/FormTextareaField';
import { Spinner } from '@/components/ui/Spinner';
import { formatDisplayDateTime, parseDateTimeParts } from '@/components/ui/sundayDateTimeUtils';

export interface CancelScheduleConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  applicant: {
    name: string;
    email: string;
    phone?: string;
    avatarObjectKey?: string | null;
  };
  stepNumber: number;
  stepTitle: string;
  scheduledAt?: string | null;
  reviewerName?: string | null;
}

export function CancelScheduleConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  applicant,
  stepNumber,
  stepTitle,
  scheduledAt,
  reviewerName,
}: CancelScheduleConfirmDialogProps) {
  const [reason, setReason] = useState('');

  const { datePart, timePart } = parseDateTimeParts(scheduledAt ?? undefined);
  const formattedDateTime = datePart ? formatDisplayDateTime(datePart, timePart) : null;

  const isReasonValid = Boolean(reason.trim());

  const handleConfirm = () => {
    if (!isReasonValid || isPending) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="md">
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-2">
          <CalendarX className="h-5 w-5 text-danger shrink-0" aria-hidden="true" />
          <Dialog.Title>Cancel Scheduled Session</Dialog.Title>
        </div>
        <Dialog.Description>
          Verify the cancellation details. The scheduled session date will be cleared and the step
          cannot be completed until rescheduled.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="space-y-3.5">
        {/* Applicant Profile Card */}
        <div className="flex items-center gap-3.5 rounded-xl border border-border bg-background p-3.5">
          <Avatar
            name={applicant.name}
            avatarObjectKey={applicant.avatarObjectKey}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading text-sm font-bold text-text truncate">
                {applicant.name}
              </h4>
              <Badge variant="secondary">Step {stepNumber}</Badge>
            </div>
            <p className="text-xs text-muted truncate mt-0.5">
              {applicant.email}
              {applicant.phone ? ` · ${applicant.phone}` : ''}
            </p>
          </div>
        </div>

        {/* Current Scheduled Session Details */}
        <div className="space-y-1.5 rounded-xl border border-border bg-surface p-3 text-xs">
          <div className="font-semibold text-text flex items-center justify-between">
            <span>{stepTitle} Session</span>
            <Badge variant="destructive" className="text-[10px]">
              To Be Cancelled
            </Badge>
          </div>
          <div className="space-y-1 pt-1 text-muted">
            {formattedDateTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-danger shrink-0" />
                <span>
                  Currently Scheduled:{' '}
                  <strong className="text-text font-medium">{formattedDateTime}</strong>
                </span>
              </div>
            )}
            {reviewerName && (
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>
                  Assigned Coach: <strong className="text-text font-medium">{reviewerName}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notice of consequences */}
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-text">
          <p className="font-semibold text-danger">What happens when cancelled:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5 text-muted">
            <li>
              The session date and assigned coach are cleared, and the step status returns to{' '}
              <strong>Pending</strong>.
            </li>
            <li>
              The <strong>Complete Step</strong> button will be disabled until a new date is
              scheduled.
            </li>
          </ul>
        </div>

        {/* Cancellation Reason Textarea */}
        <div className="space-y-1 pt-1">
          <FormTextareaField
            id="cancellation-reason-input"
            label="Cancellation Reason *"
            required
            placeholder="e.g. Candidate requested to reschedule due to emergency, or schedule conflict..."
            rows={3}
            textareaClassName="resize-none text-xs"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            helperText="Required. This note will be recorded in the Recruiter Notes thread."
          />
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isPending}
          className="w-full sm:w-auto justify-center"
        >
          Keep Schedule
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirm}
          disabled={isPending || !isReasonValid}
          className="w-full sm:w-auto justify-center gap-2"
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              <span>Cancelling...</span>
            </>
          ) : (
            <>
              <CalendarX className="h-4 w-4" />
              <span>Confirm & Cancel Schedule</span>
            </>
          )}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
