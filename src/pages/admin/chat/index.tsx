import { type FormEvent, useEffect, useRef, useState } from 'react';

import { Bot, Loader2, Send, User } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Button, FormInputField } from '@/components/ui';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AdminChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`,
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      if (!response.body) {
        setIsLoading(false);
        return;
      }

      const assistantMessageId = Date.now().toString();
      setMessages((prev) => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let done = false;
      let textBuffer = '';

      // Vercel AI SDK text streams send chunks starting with '0:'
      // Example: 0:"Hello "
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const content = JSON.parse(line.slice(2));
                textBuffer += content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId ? { ...msg, content: textBuffer } : msg,
                  ),
                );
              } catch {
                // ignore parse errors for partial chunks if any
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'assistant', content: 'Sorry, I encountered an error.' },
      ]);
    } finally {
      setIsLoading(false);
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
                <p className="text-sm">Ask me questions about your events and members.</p>
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    m.role === 'user' ? 'bg-accent/20 text-accent' : 'bg-muted/20 text-muted'
                  }`}
                >
                  {m.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>
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
            {isLoading && (
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
