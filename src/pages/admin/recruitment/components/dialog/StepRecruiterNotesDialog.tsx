import { MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { RecruiterNote } from '@/lib/domain/recruitment';

import { StepRecruiterNotesThread } from './StepRecruiterNotesThread';

export interface StepRecruiterNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  stepNumber: number;
  stepTitle: string;
  notes: RecruiterNote[];
  isCompletedStep?: boolean;
}

export function StepRecruiterNotesDialog({
  isOpen,
  onClose,
  applicationId,
  stepNumber,
  stepTitle,
  notes,
  isCompletedStep = false,
}: StepRecruiterNotesDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      role="dialog"
      aria-label={`Recruiter Notes for Step ${stepNumber}`}
    >
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
          <Dialog.Title>
            Recruiter Notes — Step {stepNumber}: {stepTitle}
          </Dialog.Title>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
            {notes.length}
          </Badge>
        </div>
        <Dialog.Description className="mt-1 text-xs text-muted">
          Internal feedback and candidate observations recorded for this step.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <StepRecruiterNotesThread
          applicationId={applicationId}
          stepNumber={stepNumber}
          stepTitle={stepTitle}
          notes={notes}
          isCompletedStep={isCompletedStep}
          hideHeader
          hideBorder
        />
      </Dialog.Body>

      <Dialog.Footer bordered>
        <Button variant="primaryOutline" size="md" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
