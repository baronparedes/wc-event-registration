import { useState } from 'react';

import { AlertCircle, Check, Copy, PenTool, RotateCw, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertBanner,
  Button,
  ButtonGroup,
  type ButtonGroupOption,
  Dialog,
  FormTextareaField,
  Spinner,
} from '@/components/ui';
import { useBroadcastDraftAi } from '@/hooks/domain/notifications';
import type {
  BroadcastDraftMode,
  BroadcastTone,
  GenerateBroadcastDraftResponse,
} from '@/lib/domain/notifications';

export interface BroadcastDraftAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (draft: { title: string; message: string }) => void;
  currentTitle?: string;
  currentMessage?: string;
  targetType?: 'all' | 'role' | 'user' | 'event';
  targetRoles?: string[];
}

const MODE_OPTIONS: ButtonGroupOption<BroadcastDraftMode>[] = [
  { value: 'new', label: 'Draft from Notes', icon: <PenTool className="h-3.5 w-3.5" /> },
  { value: 'polish', label: 'Polish Existing', icon: <Wand2 className="h-3.5 w-3.5" /> },
];

const TONE_OPTIONS: ButtonGroupOption<BroadcastTone>[] = [
  { value: 'pastoral', label: 'Pastoral & Warm' },
  { value: 'urgent', label: 'Urgent & Direct' },
  { value: 'informative', label: 'Informative & Clear' },
  { value: 'fun', label: 'Fun & Engaging 🎉' },
];

export function BroadcastDraftAiModal({
  isOpen,
  onClose,
  onApply,
  currentTitle = '',
  currentMessage = '',
  targetType,
  targetRoles,
}: BroadcastDraftAiModalProps) {
  const [mode, setMode] = useState<BroadcastDraftMode>('new');
  const [tone, setTone] = useState<BroadcastTone>('pastoral');
  const [notes, setNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<
    GenerateBroadcastDraftResponse['draft'] | null
  >(null);

  const draftMutation = useBroadcastDraftAi({
    onSuccess: (data) => {
      setGeneratedDraft(data.draft);
      toast.success('Generated broadcast draft successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate draft.');
    },
  });

  const handleModeChange = (nextMode: BroadcastDraftMode) => {
    setMode(nextMode);
    if (nextMode === 'polish' && !notes.trim()) {
      const combined = [currentTitle.trim(), currentMessage.trim()].filter(Boolean).join('\n\n');
      if (combined) {
        setNotes(combined);
      }
    }
  };

  const handleClose = () => {
    setNotes('');
    setGeneratedDraft(null);
    setIsCopied(false);
    onClose();
  };

  const handleGenerate = () => {
    if (!notes.trim()) {
      toast.error('Please enter notes or content to draft.');
      return;
    }

    draftMutation.mutate({
      mode,
      notes: notes.trim(),
      tone,
      targetType,
      targetRoles,
    });
  };

  const handleCopy = async () => {
    if (!generatedDraft) return;
    try {
      const textToCopy = `${generatedDraft.title}\n\n${generatedDraft.message}`;
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        toast.success('Copied draft to clipboard!');
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const handleApply = () => {
    if (!generatedDraft) return;
    onApply({
      title: generatedDraft.title,
      message: generatedDraft.message,
    });
    toast.success('Applied AI draft to broadcast form!');
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="2xl">
      <Dialog.Header showCloseButton onClose={handleClose}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <Dialog.Title>AI Broadcast Assistant</Dialog.Title>
            <Dialog.Description>
              Draft or polish church announcements tuned for ministry communication.
            </Dialog.Description>
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className="space-y-4">
        {/* Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text uppercase tracking-wider">
            Assistant Mode
          </label>
          <ButtonGroup<BroadcastDraftMode>
            value={mode}
            onChange={handleModeChange}
            options={MODE_OPTIONS}
            size="sm"
            fullWidth
          />
        </div>

        {/* Tone Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text uppercase tracking-wider">
            Desired Tone
          </label>
          <ButtonGroup<BroadcastTone>
            value={tone}
            onChange={(nextTone) => setTone(nextTone)}
            options={TONE_OPTIONS}
            size="sm"
            fullWidth
          />
        </div>

        {/* Input Textarea */}
        <div className="space-y-1.5">
          <FormTextareaField
            id="broadcast-ai-notes"
            label={mode === 'new' ? 'Bullet Points & Notes' : 'Existing Draft to Polish'}
            placeholder={
              mode === 'new'
                ? 'e.g., Usher reminder for Sunday: Call time 8:15 AM for prayer, wear blue vest, communion preparation...'
                : 'Paste or review the broadcast draft you want to refine...'
            }
            rows={4}
            maxLength={1500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            helperText={`${notes.length}/1500 characters`}
          />
        </div>

        {draftMutation.isError && (
          <AlertBanner
            variant="error"
            icon={<AlertCircle className="h-4 w-4 shrink-0" />}
            title="Draft Generation Failed"
            description={
              draftMutation.error?.message ||
              'Unable to generate draft. Please check your inputs and try again.'
            }
          />
        )}

        {/* Generate / Regenerate Action */}
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={draftMutation.isPending || !notes.trim()}
            className="gap-2"
          >
            {draftMutation.isPending ? (
              <>
                <Spinner size="sm" />
                <span>Crafting Announcement...</span>
              </>
            ) : generatedDraft ? (
              <>
                <RotateCw className="h-4 w-4" />
                <span>Regenerate Draft</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Draft</span>
              </>
            )}
          </Button>
        </div>

        {/* Generated Draft Preview */}
        {generatedDraft && (
          <div className="mt-4 rounded-xl border border-border bg-background/50 p-4 space-y-4">
            <span className="text-xs font-semibold text-text uppercase tracking-wider">
              Generated Announcement Draft
            </span>

            <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">Title / Subject</span>
                <span className="text-xs text-muted">{generatedDraft.title.length}/100 chars</span>
              </div>
              <p className="text-sm font-semibold text-text">{generatedDraft.title}</p>

              <div className="border-t border-border/60 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Message</span>
                  <span className="text-xs text-muted">
                    {generatedDraft.message.length}/500 chars
                  </span>
                </div>
                <p className="text-sm text-text whitespace-pre-wrap mt-0.5">
                  {generatedDraft.message}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopy}
              >
                {isCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-primary" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
              <Button type="button" size="sm" className="gap-1.5" onClick={handleApply}>
                <Check className="h-3.5 w-3.5" />
                <span>Apply Draft</span>
              </Button>
            </div>
          </div>
        )}
      </Dialog.Body>

      <Dialog.Footer>
        <Button type="button" variant="outline" onClick={handleClose}>
          Close
        </Button>
      </Dialog.Footer>
    </Dialog>
  );
}
