import React, { useState } from 'react';

import { MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormTextareaField } from '@/components/ui/FormTextareaField';
import { Spinner } from '@/components/ui/Spinner';
import { useAddRecruiterNoteMutation } from '@/hooks/domain/recruitment';
import type { RecruiterNote } from '@/lib/domain/recruitment';

export interface StepRecruiterNotesThreadProps {
  applicationId: string;
  stepNumber: number;
  stepTitle: string;
  notes: RecruiterNote[];
  isCompletedStep?: boolean;
  hideHeader?: boolean;
  hideBorder?: boolean;
}

function formatNoteDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Manila',
    });
  } catch {
    return dateStr;
  }
}

export function StepRecruiterNotesThread({
  applicationId,
  stepNumber,
  stepTitle,
  notes,
  hideHeader = false,
  hideBorder = false,
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
    <div className={`${hideBorder ? '' : 'border-t border-border/80 pt-3'} space-y-3`}>
      {/* Header */}
      {!hideHeader && (
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
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/70 bg-background/40 p-3 text-center text-xs text-muted">
          No recruiter notes recorded for this step yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border/70 bg-background/40 divide-y divide-border/40 max-h-80 overflow-y-auto px-3 py-1">
          {notes.map((note) => (
            <div key={note.id} className="py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    name={note.author_name}
                    avatarObjectKey={note.avatar_object_key}
                    size="xs"
                  />
                  <span className="font-medium text-xs text-text truncate">{note.author_name}</span>
                </div>
                <span className="text-[11px] text-muted shrink-0">
                  {formatNoteDate(note.created_at)}
                </span>
              </div>
              <p className="text-text whitespace-pre-wrap pl-7 text-xs leading-relaxed break-words">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Note Composer */}
      <form onSubmit={handleAddNote} className="space-y-1.5 pt-1">
        <FormTextareaField
          id="addRecruiterNote"
          label="Add Recruiter Note"
          placeholder={`Type internal feedback, candidate observations, or notes for Step ${stepNumber}...`}
          rows={2}
          className="space-y-1"
          textareaClassName="resize-none text-xs min-h-[56px] py-2 px-3"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          disabled={addNoteMutation.isPending}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="default"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={addNoteMutation.isPending || !content.trim()}
          >
            {addNoteMutation.isPending ? (
              <>
                <Spinner className="mr-1.5 h-3 w-3 text-white" />
                Posting Note...
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3 w-3" />
                Add Note
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
