import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Bot, Loader2, Send } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Avatar, Button, FormInputField } from '@/components/ui';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useChatStreamQuery } from '@/hooks/domain/chat';
import { useCurrentProfileQuery } from '@/hooks/domain/members';

import { ChatMessageContent } from './components';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AdminChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
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
    } catch (error) {
      console.error('Chat error:', error);
      const isLowLevelError =
        !error ||
        !(error instanceof Error) ||
        !error.message ||
        error.message === 'Network error' ||
        error.message === 'Failed to fetch' ||
        error.message.startsWith('Edge function failed:');

      const fallbackContent = isLowLevelError ? 'Sorry, I encountered an error.' : error.message;

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
      />

      <AdminPageShell.Content isLoading={false} loadingMessage="">
        <div className="flex h-[calc(100vh-14rem)] min-h-[520px] max-h-[820px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                <Bot className="mb-4 h-12 w-12 opacity-20" />
                <p>Hi! I'm your AI assistant.</p>
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/20 text-muted">
                    <Bot className="h-5 w-5" />
                  </div>
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
