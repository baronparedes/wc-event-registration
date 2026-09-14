import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Loader2, RotateCcw, Send } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Avatar, BrandAvatar, Button, FormInputField } from '@/components/ui';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useChatStreamQuery } from '@/hooks/domain/chat';
import { useCurrentProfileQuery } from '@/hooks/domain/members';

import { ChatMessageContent } from './components';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const CHAT_STORAGE_KEY = 'wc_admin_chat_messages';

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
  const [messages, setMessages] = useState<Message[]>(loadStoredMessages);
  const [input, setInput] = useState('');
  const { streamRequest, isLoading } = useChatStreamQuery();
  const { data: adminAuth } = useAdminAuthQuery();
  const { data: currentProfile } = useCurrentProfileQuery();

  const displayName = currentProfile?.full_name ?? adminAuth?.session?.user?.email ?? 'User';
  const avatarObjectKey = currentProfile?.avatar_object_key;

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        window.sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } else {
        window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save chat messages to sessionStorage', error);
    }
  }, [messages]);

  const handleClearChat = () => {
    setMessages([]);
    try {
      window.sessionStorage.removeItem(CHAT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear chat messages from sessionStorage', error);
    }
  };

  useEffect(() => {
    if (bottomRef.current?.scrollIntoView) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    const trimmedInput = input.trim();
    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: trimmedInput };
    const assistantMessageId = crypto.randomUUID();
    const currentMessages = [...messages, userMessage];

    setMessages([...currentMessages, { id: assistantMessageId, role: 'assistant', content: '' }]);
    setInput('');

    try {
      await streamRequest({ messages: currentMessages }, (textBuffer: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: textBuffer } : msg,
          ),
        );
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId && !msg.content.trim()
            ? { ...msg, content: "I'm on a coffee break, you can come back later." }
            : msg,
        ),
      );
    } catch (error) {
      console.error('Chat error:', error);
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
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'AI Assistant' }]}
        title="AI Assistant"
        description="Ask questions about data and events."
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
                <p className="font-medium text-text">Hi! I'm your AI assistant.</p>
                <p className="text-sm">Ask me questions about your events.</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {m.role === 'user' ? (
                  <Avatar
                    name={displayName}
                    avatarObjectKey={avatarObjectKey}
                    size="sm"
                    className="h-8 w-8 shrink-0 text-xs"
                  />
                ) : (
                  <BrandAvatar size="xs" />
                )}
                <div
                  className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    m.role === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-background border border-border rounded-tl-none shadow-sm'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                  ) : m.content.trim() ? (
                    <ChatMessageContent content={m.content} />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted" />
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} className="h-1" />
          </div>

          <div className="border-t border-border bg-background p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <FormInputField
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1"
                inputClassName="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
              <Button
                type="submit"
                variant="default"
                disabled={isLoading || !input.trim()}
                className="shrink-0"
              >
                <Send className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          </div>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
