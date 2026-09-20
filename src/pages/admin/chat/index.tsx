import { useCallback, useEffect, useRef, useState } from 'react';

import { RotateCcw } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Badge, BrandAvatar, Button } from '@/components/ui';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useChatStreamQuery, useUserTokenMapQuery } from '@/hooks/domain/chat';
import { useCurrentProfileQuery } from '@/hooks/domain/members';
import { tokenizeUserText } from '@/lib/domain/chat';

import { ChatInputForm, ChatMessageItem, type ChatMessageItemData } from './components';

type Message = ChatMessageItemData;

const CHAT_STORAGE_KEY = 'wc_admin_chat_messages';
const MAX_CONTEXT_MESSAGES = 20;

function isValidMessage(item: unknown): item is Message {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.content === 'string' &&
    (candidate.role === 'user' || candidate.role === 'assistant')
  );
}

function loadStoredMessages(): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed: unknown = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidMessage);
      }
    }
  } catch (error) {
    console.error('Failed to load chat messages from sessionStorage', error);
  }
  return [];
}

export function AdminChatPage() {
  const { data: userTokenMap = {} } = useUserTokenMapQuery();
  const [messages, setMessages] = useState<Message[]>(loadStoredMessages);
  const { streamRequest, stopStream, isLoading } = useChatStreamQuery();
  const { data: adminAuth } = useAdminAuthQuery();
  const { data: currentProfile } = useCurrentProfileQuery();

  const displayName = currentProfile?.full_name ?? adminAuth?.session?.user?.email ?? 'User';
  const avatarObjectKey = currentProfile?.avatar_object_key;

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isSubmittingRef = useRef(false);

  // Only persist to sessionStorage when not actively streaming to avoid heavy JSON.stringify blocking
  useEffect(() => {
    if (isLoading) return;
    try {
      if (messages.length > 0) {
        window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } else {
        window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save chat messages to sessionStorage', error);
    }
  }, [messages, isLoading]);

  const handleClearChat = () => {
    setMessages([]);
    try {
      window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear chat messages from sessionStorage', error);
    }
  };

  const scrollToBottom = useCallback((smooth = false) => {
    if (smooth && bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom(!isLoading);
  }, [messages.length, isLoading, scrollToBottom]);

  const handleSendMessage = async (trimmedInput: string) => {
    if (!trimmedInput || isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const tokenizedInput = tokenizeUserText(trimmedInput, userTokenMap);
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: tokenizedInput };
    const assistantMessageId = crypto.randomUUID();
    const currentMessages = [...messages, userMessage];

    setMessages([...currentMessages, { id: assistantMessageId, role: 'assistant', content: '' }]);
    scrollToBottom(true);

    // Sliding context window: send at most the last MAX_CONTEXT_MESSAGES to keep AI latency low
    const contextMessages = currentMessages.slice(-MAX_CONTEXT_MESSAGES).map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.role === 'user' ? tokenizeUserText(msg.content, userTokenMap) : msg.content,
    }));

    let pendingBuffer = '';
    let rafId: number | null = null;

    const flushBuffer = () => {
      if (pendingBuffer !== '') {
        const text = pendingBuffer;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMessageId ? { ...msg, content: text } : msg)),
        );
        scrollToBottom(false);
        rafId = null;
      }
    };

    try {
      await streamRequest({ messages: contextMessages }, (textBuffer: string) => {
        pendingBuffer = textBuffer;
        if (!rafId) {
          rafId =
            typeof requestAnimationFrame === 'function'
              ? requestAnimationFrame(flushBuffer)
              : (flushBuffer(), null);
        }
      });
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushBuffer();

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId && !msg.content.trim()
            ? { ...msg, content: "I'm on a coffee break, you can come back later." }
            : msg,
        ),
      );
    } catch (error) {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      flushBuffer();

      console.error('Chat error:', error);
      const isAbortError =
        (error instanceof DOMException && error.name === 'AbortError') ||
        (error instanceof Error && error.name === 'AbortError');

      if (isAbortError) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId && !msg.content.trim()
              ? { ...msg, content: '[Request aborted]' }
              : msg,
          ),
        );
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        const isQuota = /429|quota|resource_exhausted|rate\s*limit/i.test(errMsg);

        const isLowLevelError =
          !errMsg ||
          errMsg === 'Network error' ||
          errMsg === 'Failed to fetch' ||
          errMsg.startsWith('Edge function failed:');

        const fallbackContent = isQuota
          ? "I'm on a coffee break, you can come back later."
          : isLowLevelError
            ? 'Sorry, I encountered an error.'
            : errMsg;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: fallbackContent } : msg,
          ),
        );
      }
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        title="AI Assistant"
        badge={
          <Badge
            variant="outline"
            className="border-secondary/50 bg-secondary/10 text-secondary text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5"
          >
            Beta
          </Badge>
        }
        description={
          <p className="text-xs opacity-90 leading-relaxed italic">
            AI responses can be inaccurate. Always verify critical data independently. This tool is
            for informational purposes and does not replace human judgment.
          </p>
        }
        actions={
          messages.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              disabled={isLoading}
              className="gap-1.5"
              aria-label="Clear chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Chat</span>
            </Button>
          ) : undefined
        }
      />

      <AdminPageShell.Content isLoading={false} loadingMessage="">
        <div className="flex h-[calc(100vh-14rem)] min-h-[520px] max-h-[820px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                <BrandAvatar size="md" className="mb-4" />
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-text">Hi! I'm your AI assistant.</p>
                  <Badge
                    variant="outline"
                    className="border-secondary/50 bg-secondary/10 text-secondary text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5"
                  >
                    Beta
                  </Badge>
                </div>
                <p className="text-sm">Ask me questions about data and events.</p>
              </div>
            )}
            {messages.map((m) => (
              <ChatMessageItem
                key={m.id}
                message={m}
                displayName={displayName}
                avatarObjectKey={avatarObjectKey}
                isLoading={isLoading && m.id === messages[messages.length - 1]?.id}
              />
            ))}
            {messages.length > 0 && <div ref={bottomRef} className="h-1" />}
          </div>

          <div className="border-t border-border bg-background p-4">
            <ChatInputForm
              isLoading={isLoading}
              onSubmit={handleSendMessage}
              onStop={stopStream}
              tokenMap={userTokenMap}
            />
          </div>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
