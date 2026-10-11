import {
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Send, Square } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import { Button, FormTextareaField } from '@/components/ui';
import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';
import { findMentionCandidates, splitTextByMentions } from '@/lib/domain/chat';

import { type ChatInputFormValues, chatInputSchema } from '../types';
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dismissedAtIndex, setDismissedAtIndex] = useState<number | null>(null);

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { register, reset, setValue, control } = useForm<ChatInputFormValues>({
    resolver: zodResolver(chatInputSchema),
    defaultValues: {
      message: '',
    },
  });

  const message = useWatch({ control, name: 'message' }) ?? '';

  // Auto-resize textarea height to fit content, up to max height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (!message.trim()) {
      textarea.style.height = '44px';
      textarea.style.overflowY = 'hidden';
      return;
    }

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 44;
    const maxHeight = 160;

    if (scrollHeight <= minHeight) {
      textarea.style.height = `${minHeight}px`;
      textarea.style.overflowY = 'hidden';
    } else if (scrollHeight >= maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }, [message]);

  // Compute active mention query if '@' is present before cursor / end
  const mentionInfo = useMemo(() => {
    const lastAtIndex = message.lastIndexOf('@');
    if (lastAtIndex === -1) return null;
    if (dismissedAtIndex === lastAtIndex) return null;

    // Verify query after '@' does not have newlines or excessive length
    const query = message.slice(lastAtIndex + 1);
    if (/[\n\r]/.test(query) || query.length > 25) return null;

    return { atIndex: lastAtIndex, query };
  }, [message, dismissedAtIndex]);

  const candidates = useMemo(() => {
    if (!mentionInfo) return [];
    return findMentionCandidates(mentionInfo.query, tokenMap, 5);
  }, [mentionInfo, tokenMap]);

  const showMentionPopover = Boolean(mentionInfo && candidates.length > 0);

  // Split message into segments to style mentions as primary underlined
  const hasMention = Boolean(message && /@/.test(message));
  const segments = useMemo(() => {
    if (!hasMention) return [];
    return splitTextByMentions(message, tokenMap);
  }, [hasMention, message, tokenMap]);

  const handleScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollTop = e.currentTarget.scrollTop;
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleSelectCandidate = useCallback(
    (candidate: ResolvedToken) => {
      if (!mentionInfo) return;
      const prefix = message.slice(0, mentionInfo.atIndex);
      // Insert the candidate full name with a trailing space
      const mentionName = candidate.fullName || candidate.name;
      const nextInput = `${prefix}@${mentionName} `;
      setValue('message', nextInput, { shouldValidate: true, shouldDirty: true });
      setSelectedIndex(0);
      // Dismiss the mention for this '@' position so popover closes immediately
      setDismissedAtIndex(mentionInfo.atIndex);
      textareaRef.current?.focus();
    },
    [message, mentionInfo, setValue],
  );

  const handleFormSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      const result = chatInputSchema.safeParse({ message });
      if (!result.success || isLoading) return;
      reset({ message: '' });
      setDismissedAtIndex(null);
      setSelectedIndex(0);
      onSubmit(result.data.message);
    },
    [isLoading, message, onSubmit, reset],
  );

  const messageRegistration = register('message', {
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      const lastAtIndex = val.lastIndexOf('@');
      if (lastAtIndex === -1 || lastAtIndex !== dismissedAtIndex) {
        setDismissedAtIndex(null);
      }
      setSelectedIndex(0);
    },
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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

    // Submit on Enter without Shift, while allowing Shift+Enter for newlines
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleFormSubmit();
    }
  };

  const backdrop = hasMention ? (
    <div
      aria-hidden="true"
      ref={backdropRef}
      className="pointer-events-none absolute inset-0 overflow-hidden px-4 py-2.5 text-sm leading-5 whitespace-pre-wrap break-words font-normal text-text select-none"
    >
      {segments.map((seg, i) =>
        seg.isMention ? (
          <span
            key={i}
            className="text-primary font-medium underline underline-offset-2 decoration-primary/80"
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </div>
  ) : null;

  const handleRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      messageRegistration.ref(node);
    },
    [messageRegistration],
  );

  const activeDescendant =
    showMentionPopover && candidates[selectedIndex]
      ? `mention-option-${candidates[selectedIndex].id}`
      : undefined;

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
      <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
        <FormTextareaField
          registration={messageRegistration}
          textareaRef={handleRef}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          backdrop={backdrop}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showMentionPopover}
          aria-haspopup="listbox"
          aria-controls={showMentionPopover ? 'chat-mention-listbox' : undefined}
          aria-activedescendant={activeDescendant}
          ariaLabel="Ask about volunteers, schedules, events... (Shift+Enter for new line, @ to mention)"
          placeholder="Ask about volunteers, schedules, events... (Shift+Enter for new line, @ to mention)"
          rows={1}
          className="flex-1 min-w-0"
          textareaClassName={`w-full resize-none rounded-xl border border-border bg-surface px-4 py-2.5 text-sm leading-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:border-accent transition h-[44px] min-h-[44px] max-h-[160px] ${
            hasMention ? 'text-transparent caret-text selection:bg-primary/20' : 'text-text'
          }`}
        />
        {isLoading ? (
          <Button
            type="button"
            variant="outline"
            onClick={onStop}
            className="mb-2 shrink-0 text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
            aria-label="Stop generating"
          >
            <Square className="h-4 w-4 sm:mr-2 fill-current" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        ) : (
          <Button
            type="submit"
            variant="default"
            disabled={!message.trim()}
            className="mb-2 shrink-0"
          >
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        )}
      </form>
    </div>
  );
});
