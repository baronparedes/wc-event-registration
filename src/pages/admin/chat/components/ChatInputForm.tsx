import { type FormEvent, type KeyboardEvent, memo, useCallback, useMemo, useState } from 'react';

import { Send, Square } from 'lucide-react';

import { Button, FormInputField } from '@/components/ui';
import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';
import { findMentionCandidates } from '@/lib/domain/chat';

import { ChatMentionPopover } from './ChatMentionPopover';

interface ChatInputFormProps {
  isLoading: boolean;
  onSubmit: (message: string) => void;
  onStop: () => void;
  tokenMap?: Record<string, ResolvedToken>;
}

export const ChatInputForm = memo(function ChatInputForm({
  isLoading,
  onSubmit,
  onStop,
  tokenMap = {},
}: ChatInputFormProps) {
  const [input, setInput] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dismissedAtIndex, setDismissedAtIndex] = useState<number | null>(null);

  // Compute active mention query if '@' is present before cursor / end
  const mentionInfo = useMemo(() => {
    const lastAtIndex = input.lastIndexOf('@');
    if (lastAtIndex === -1) return null;
    if (dismissedAtIndex === lastAtIndex) return null;

    // Verify query after '@' does not have newlines or excessive length
    const query = input.slice(lastAtIndex + 1);
    if (/[\n\r]/.test(query) || query.length > 25) return null;

    return { atIndex: lastAtIndex, query };
  }, [input, dismissedAtIndex]);

  const candidates = useMemo(() => {
    if (!mentionInfo) return [];
    return findMentionCandidates(mentionInfo.query, tokenMap, 5);
  }, [mentionInfo, tokenMap]);

  const showMentionPopover = Boolean(mentionInfo && candidates.length > 0);

  const handleSelectCandidate = useCallback(
    (candidate: ResolvedToken) => {
      if (!mentionInfo) return;
      const prefix = input.slice(0, mentionInfo.atIndex);
      // Insert the candidate full name with a trailing space
      const mentionName = candidate.fullName || candidate.name;
      const nextInput = `${prefix}@${mentionName} `;
      setInput(nextInput);
      setSelectedIndex(0);
      // Dismiss the mention for this '@' position so popover closes immediately
      setDismissedAtIndex(mentionInfo.atIndex);
    },
    [input, mentionInfo],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (showMentionPopover && candidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % candidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const candidate = candidates[selectedIndex];
        if (candidate) {
          handleSelectCandidate(candidate);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mentionInfo) {
          setDismissedAtIndex(mentionInfo.atIndex);
        }
        return;
      }
    }
  };

  const handleChange = (val: string) => {
    setInput(val);
    const lastAtIndex = val.lastIndexOf('@');
    // If user deleted the '@' or typed a new '@' at a different position, reset dismissedAtIndex
    if (lastAtIndex === -1 || lastAtIndex !== dismissedAtIndex) {
      setDismissedAtIndex(null);
    }
    setSelectedIndex(0);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    setDismissedAtIndex(null);
    setSelectedIndex(0);
    onSubmit(trimmed);
  };

  return (
    <div className="relative">
      {showMentionPopover && (
        <ChatMentionPopover
          candidates={candidates}
          selectedIndex={selectedIndex}
          onSelect={handleSelectCandidate}
          onHighlight={setSelectedIndex}
        />
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <FormInputField
          value={input}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about volunteers, schedules, events... (type @ to mention a member)"
          className="flex-1"
          inputClassName="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
        />
        {isLoading ? (
          <Button
            type="button"
            variant="outline"
            onClick={onStop}
            className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200"
            aria-label="Stop generating"
          >
            <Square className="h-4 w-4 sm:mr-2 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        ) : (
          <Button type="submit" variant="default" disabled={!input.trim()} className="shrink-0">
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        )}
      </form>
    </div>
  );
});
