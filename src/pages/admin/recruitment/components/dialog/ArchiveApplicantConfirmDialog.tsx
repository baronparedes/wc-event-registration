import { useState } from 'react';

import { Archive, RotateCcw } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { FormTextareaField } from '@/components/ui/FormTextareaField';
import { Spinner } from '@/components/ui/Spinner';

export interface ArchiveApplicantConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  isPending: boolean;
  mode: 'archive' | 'restore';
  applicant: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
    currentStep?: number;
    avatarObjectKey?: string | null;
  };
}

export function ArchiveApplicantConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  mode,
  applicant,
}: ArchiveApplicantConfirmDialogProps) {
  const [notes, setNotes] = useState('');

  const isArchive = mode === 'archive';
  const title = isArchive ? 'Archive Applicant' : 'Restore Applicant to Active';

  const handleConfirm = () => {
    onConfirm(notes.trim() || undefined);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <Dialog.Header showCloseButton onClose={onClose}>
        <div className="flex items-center gap-2">
          {isArchive ? (
            <Archive className="h-5 w-5 text-danger shrink-0" />
          ) : (
            <RotateCcw className="h-5 w-5 text-primary shrink-0" />
          )}
          <Dialog.Title>{title}</Dialog.Title>
        </div>
        <Dialog.Description>
          {isArchive
            ? 'Pausing this applicant will move them to the Archived list and halt active pipeline progression.'
            : 'Restoring this applicant will return them to the active recruitment pipeline.'}
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body className="space-y-4">
        {/* Applicant Card */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4 shadow-2xs">
          <Avatar
            name={applicant.name}
            avatarObjectKey={applicant.avatarObjectKey}
            size="md"
            className="shrink-0"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-heading text-base font-bold text-text truncate">
                {applicant.name}
              </h4>
              {applicant.role && <Badge variant="outline">{applicant.role}</Badge>}
              {applicant.currentStep && (
                <Badge variant="secondary">Step {applicant.currentStep}</Badge>
              )}
            </div>
            <p className="text-xs text-muted truncate">
              {applicant.email}
              {applicant.phone ? ` · ${applicant.phone}` : ''}
            </p>
          </div>
        </div>

        {/* Informational Notice */}
        <div
          className={`rounded-xl border p-3.5 text-xs ${
            isArchive
              ? 'border-danger/30 bg-danger/10 text-text'
              : 'border-primary/30 bg-primary/10 text-text'
          }`}
        >
          <p className={`font-semibold ${isArchive ? 'text-danger' : 'text-primary'}`}>
            {isArchive ? 'What happens when archived:' : 'What happens when restored:'}
          </p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5 text-muted">
            {isArchive ? (
              <>
                <li>
                  The applicant status becomes <strong>Archived</strong>.
                </li>
                <li>They will be hidden from the default active recruitment pipeline views.</li>
                <li>
                  You can access and restore them at any time from the "Archived" status filter.
                </li>
                <li>Their previous progress and transaction history will remain intact.</li>
              </>
            ) : (
              <>
                <li>
                  The applicant status returns to <strong>Active</strong>.
                </li>
                <li>
                  They will immediately reappear in the active pipeline at Step{' '}
                  {applicant.currentStep ?? 1}.
                </li>
                <li>Reviewers can continue scheduling and completing stages.</li>
              </>
            )}
          </ul>
        </div>

        {/* Optional Notes */}
        <FormTextareaField
          id="archive-notes-input"
          label={isArchive ? 'Archive Reason / Notes (Optional)' : 'Restoration Notes (Optional)'}
          placeholder={
            isArchive
              ? 'e.g. Applicant requested a pause until next month, or currently unresponsive...'
              : 'e.g. Candidate confirmed availability to resume recruitment...'
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          textareaClassName="resize-none"
        />
      </Dialog.Body>

      <Dialog.Footer>
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button
          variant={isArchive ? 'destructive' : 'default'}
          onClick={handleConfirm}
          disabled={isPending}
          className="gap-2"
        >
          {isPending ? (
            <>
              <Spinner size="sm" />
              <span>{isArchive ? 'Archiving...' : 'Restoring...'}</span>
            </>
          ) : (
            <>
              {isArchive ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              <span>{isArchive ? 'Archive Applicant' : 'Restore Applicant'}</span>
            </>
          )}
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
