import { useState } from 'react';

import { Trash2 } from 'lucide-react';

import { Button, SectionCard } from '@/components/ui';
import { useAddMemberNoteMutation, useDeleteMemberNoteMutation } from '@/hooks/domain/members';
import type { MemberNote } from '@/lib/domain/members';
import { formatDateTime } from '@/lib/infrastructure';

type MemberNotesProps = {
  memberId: string;
  notes: MemberNote[];
  disabled?: boolean;
};

export function MemberNotes({ memberId, notes = [], disabled }: MemberNotesProps) {
  const [newNoteText, setNewNoteText] = useState('');
  const addNoteMutation = useAddMemberNoteMutation();
  const deleteNoteMutation = useDeleteMemberNoteMutation();

  const handleAddNote = async () => {
    const trimmedText = newNoteText.trim();
    if (!trimmedText || trimmedText.length > 255) return;

    await addNoteMutation.mutateAsync({ memberId, text: trimmedText });
    setNewNoteText('');
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteNoteMutation.mutateAsync({ memberId, noteId });
  };

  return (
    <SectionCard title="Member Notes" subtitle="Add notes about this member (max 255 characters).">
      <div className="space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-muted">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex justify-between items-start gap-4 p-3 bg-muted/20 rounded-md border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text break-words whitespace-pre-wrap">{note.text}</p>
                  <p className="text-xs text-muted mt-1">
                    By {note.author_name} on {formatDateTime(note.created_at)}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-danger hover:text-danger hover:bg-danger/10"
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deleteNoteMutation.isPending}
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {!disabled && (
          <div className="flex flex-col gap-2 pt-2">
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Type a new note..."
              rows={3}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              maxLength={255}
              disabled={addNoteMutation.isPending}
            />
            <div className="flex justify-between items-center">
              <span
                className={`text-xs ${newNoteText.length > 255 ? 'text-danger' : 'text-muted'}`}
              >
                {newNoteText.length} / 255
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleAddNote}
                disabled={
                  !newNoteText.trim() || newNoteText.length > 255 || addNoteMutation.isPending
                }
              >
                {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
