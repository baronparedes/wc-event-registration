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
import { ArrowRight, AtSign, Square } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui';
import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';
import { useIsMobileViewport } from '@/hooks/utils';
import { findMentionCandidates, splitTextByMentions } from '@/lib/domain/chat';

import { type ChatInputFormValues, chatInputSchema } from '../types';
import { ChatMentionPopover } from './ChatMentionPopover';

const CHAT_INPUT_PLACEHOLDER = 'Ask about volunteers, schedules, events...';
const CHAT_INPUT_PLACEHOLDER_MOBILE = 'Ask a question...';

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
  const isMobile = useIsMobileViewport();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dismissedAtIndex, setDismissedAtIndex] = useState<number | null>(null);
  const [isMultiline, setIsMultiline] = useState(false);

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
      textarea.style.height = '32px';
      textarea.style.overflowY = 'hidden';
      setIsMultiline(false);
      return;
    }

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const minHeight = 32;
    const maxHeight = 160;

    const multiline = scrollHeight > minHeight + 4;
    setIsMultiline(multiline);

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

  const handleMentionButtonClick = useCallback(() => {
    const currentMessage = message;
    const nextMessage =
      !currentMessage || currentMessage.endsWith(' ')
        ? `${currentMessage}@`
        : `${currentMessage} @`;
    setValue('message', nextMessage, { shouldValidate: true, shouldDirty: true });
    setDismissedAtIndex(null);
    setSelectedIndex(0);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      const length = nextMessage.length;
      textarea.setSelectionRange(length, length);
    }
  }, [message, setValue]);

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
      className="pointer-events-none absolute inset-0 overflow-hidden pl-3 pr-8 py-1.5 text-sm leading-5 whitespace-pre-wrap break-words font-normal text-text select-none"
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
      <form
        onSubmit={handleFormSubmit}
        className="rounded-xl border border-border bg-surface px-2.5 py-1 shadow-xs transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 [&_grammarly-extension]:!translate-y-[3px]"
      >
        <div className={`flex gap-1.5 ${isMultiline ? 'items-end' : 'items-center'}`}>
          <div className={`relative flex-1 min-w-0 ${isMultiline ? '' : 'flex items-center'}`}>
            {backdrop}
            <textarea
              {...messageRegistration}
              ref={handleRef}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={showMentionPopover}
              aria-haspopup="listbox"
              aria-controls={showMentionPopover ? 'chat-mention-listbox' : undefined}
              aria-activedescendant={activeDescendant}
              aria-label={isMobile ? CHAT_INPUT_PLACEHOLDER_MOBILE : CHAT_INPUT_PLACEHOLDER}
              placeholder={isMobile ? CHAT_INPUT_PLACEHOLDER_MOBILE : CHAT_INPUT_PLACEHOLDER}
              rows={1}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              className={`w-full block resize-none border-none outline-none ring-0 shadow-none bg-transparent pl-3 pr-8 py-1.5 text-sm leading-5 placeholder:truncate focus:border-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none active:outline-none active:border-none active:ring-0 h-8 min-h-8 max-h-[160px] ${
                hasMention ? 'text-transparent caret-text selection:bg-primary/20' : 'text-text'
              }`}
            />
          </div>

          <div
            className={`flex shrink-0 items-center gap-1 ${isMultiline ? 'self-end pb-0.5' : ''}`}
          >
            <button
              type="button"
              onClick={handleMentionButtonClick}
              className="inline-flex h-8 w-8 sm:w-auto items-center justify-center rounded-lg px-0 sm:px-2.5 text-xs font-medium text-muted hover:bg-muted/10 hover:text-text transition-colors select-none"
              aria-label="Mention a member"
              title="Mention a member"
            >
              <AtSign className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline sm:ml-1">mention</span>
            </button>

            {isLoading ? (
              <Button
                type="button"
                size="xs"
                onClick={onStop}
                className="min-h-8 h-8 w-8 sm:w-auto rounded-lg border-danger/30 bg-danger/10 px-0 sm:px-3 text-xs font-semibold text-danger hover:bg-danger/20 hover:text-danger flex items-center justify-center"
                aria-label="Stop generating"
              >
                <Square className="h-3 w-3 fill-current" />
                <span className="hidden sm:inline sm:ml-1">Stop</span>
              </Button>
            ) : (
              <Button
                type="submit"
                variant="default"
                size="xs"
                disabled={!message.trim()}
                className="min-h-8 h-8 w-8 sm:w-auto rounded-lg px-0 sm:px-3 text-xs font-semibold shadow-xs flex items-center justify-center"
                aria-label="Send message"
                title="Send message (Enter to send, Shift+Enter for new line)"
              >
                <span className="hidden sm:inline">Send</span>
                <ArrowRight className="h-3.5 w-3.5 sm:ml-1" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
});
