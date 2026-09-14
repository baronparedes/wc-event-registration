import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Bot, Loader2, Send } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Avatar, Button, FormInputField } from '@/components/ui';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useChatStreamQuery } from '@/hooks/domain/chat';
import { useCurrentProfileQuery } from '@/hooks/domain/members';

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');

    const assistantMessageId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

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
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, I encountered an error.' },
      ]);
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
        <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-muted">
                <Bot className="mb-4 h-12 w-12 opacity-20" />
                <p>Hi! I'm your AI assistant.</p>
                <p className="text-sm">Ask me questions about your events, forms and members.</p>
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
                  className={`rounded-2xl px-4 py-2 ${
                    m.role === 'user'
                      ? 'bg-accent text-white rounded-tr-none'
                      : 'bg-background border border-border rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.content === '' && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/20 text-muted">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="rounded-2xl bg-background border border-border rounded-tl-none px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                </div>
              </div>
            )}
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
