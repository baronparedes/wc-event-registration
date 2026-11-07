import { RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { RecruitmentPipelineTransaction } from '@/lib/domain/recruitment';
import { formatDateTime } from '@/lib/infrastructure';

export interface StepAttemptsHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stepNumber: number;
  stepTitle: string;
  attempts: RecruitmentPipelineTransaction[];
}

export function StepAttemptsHistoryDialog({
  isOpen,
  onClose,
  stepNumber,
  stepTitle,
  attempts,
}: StepAttemptsHistoryDialogProps) {
  const stepLabel = stepNumber === 2 ? 'Interview' : stepTitle;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      role="dialog"
      aria-label={`Previous ${stepLabel} Attempts`}
    >
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-primary" aria-hidden="true" />
          <Dialog.Title>
            Previous {stepLabel} Attempts ({attempts.length})
          </Dialog.Title>
        </div>
        <Dialog.Description className="mt-1 text-xs text-muted">
          Past session attempts and evaluations recorded for this stage.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted">Recorded History Intact</span>
          <Badge variant="secondary" className="text-[10px]">
            {attempts.length} {attempts.length === 1 ? 'Attempt' : 'Attempts'}
          </Badge>
        </div>

        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {attempts.map((tx) => (
            <div
              key={tx.id}
              className="rounded-lg border border-border/70 bg-surface p-3 text-xs space-y-2"
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
                <div className="mt-1 rounded-md bg-background p-2.5 text-[11px] text-text border border-border/40">
                  <span className="font-medium text-muted block mb-0.5">Recruitment Notes:</span>
                  <p className="whitespace-pre-wrap">{tx.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Dialog.Body>

      <Dialog.Footer bordered>
        <Button variant="primaryOutline" size="md" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
