import React, { useState } from 'react';

import { MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormTextareaField } from '@/components/ui/FormTextareaField';
import { Spinner } from '@/components/ui/Spinner';
import { formatDisplayDateTime, parseDateTimeParts } from '@/components/ui/sundayDateTimeUtils';
import { useAddRecruiterNoteMutation } from '@/hooks/domain/recruitment';
import type { RecruiterNote } from '@/lib/domain/recruitment';

export interface StepRecruiterNotesThreadProps {
  applicationId: string;
  stepNumber: number;
  stepTitle: string;
  notes: RecruiterNote[];
  isCompletedStep?: boolean;
}

function formatNoteDate(dateStr: string): string {
  try {
    const { datePart, timePart } = parseDateTimeParts(dateStr);
    return datePart ? formatDisplayDateTime(datePart, timePart) : dateStr;
  } catch {
    return dateStr;
  }
}

export function StepRecruiterNotesThread({
  applicationId,
  stepNumber,
  stepTitle,
  notes,
  isCompletedStep = false,
}: StepRecruiterNotesThreadProps) {
  const [content, setContent] = useState('');
  const addNoteMutation = useAddRecruiterNoteMutation();

  const handleAddNote = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('Note content cannot be empty');
      return;
    }

    addNoteMutation.mutate(
      {
        application_id: applicationId,
        step_number: stepNumber,
        content: trimmed,
      },
      {
        onSuccess: () => {
          setContent('');
          toast.success('Recruiter note recorded');
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : 'Failed to save note');
        },
      },
    );
  };

  return (
    <div className="border-t border-border/80 pt-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text">
          <MessageSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>Recruiter Notes</span>
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
            {notes.length}
          </Badge>
        </div>
        <span className="text-[11px] text-muted">Append-only internal notes for {stepTitle}</span>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/80 bg-surface/30 p-3 text-center text-xs text-muted">
          No recruiter notes recorded for this step yet.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border border-border/70 bg-surface/60 p-2.5 text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={note.author_name}
                    avatarObjectKey={note.avatar_object_key}
                    size="sm"
                  />
                  <span className="font-semibold text-text">{note.author_name}</span>
                  {note.author_role && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-1 border-primary/30 text-primary"
                    >
                      {note.author_role}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted font-mono">
                  {formatNoteDate(note.created_at)}
                </span>
              </div>
              <p className="text-text whitespace-pre-wrap pl-8 text-xs leading-relaxed">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Composer */}
      <form onSubmit={handleAddNote} className="space-y-2 pt-1">
        <FormTextareaField
          label={
            notes.length === 0 && !isCompletedStep ? 'Add Recruiter Note *' : 'Add Recruiter Note'
          }
          placeholder={`Type internal feedback, candidate observations, or notes for Step ${stepNumber}...`}
          rows={2}
          textareaClassName="resize-none text-xs"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={addNoteMutation.isPending}
          helperText={
            notes.length === 0 && !isCompletedStep
              ? 'At least one recruiter note is required before completing this step.'
              : undefined
          }
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="default"
            size="sm"
            disabled={addNoteMutation.isPending || !content.trim()}
          >
            {addNoteMutation.isPending ? (
              <>
                <Spinner className="mr-1.5 h-3.5 w-3.5 text-white" />
                Posting Note...
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Note
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
