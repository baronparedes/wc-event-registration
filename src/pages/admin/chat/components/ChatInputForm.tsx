import { type FormEvent, memo, useState } from 'react';

import { Send, Square } from 'lucide-react';

import { Button, FormInputField } from '@/components/ui';

interface ChatInputFormProps {
  isLoading: boolean;
  onSubmit: (message: string) => void;
  onStop: () => void;
}

export const ChatInputForm = memo(function ChatInputForm({
  isLoading,
  onSubmit,
  onStop,
}: ChatInputFormProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <FormInputField
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask me anything..."
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
  );
});
