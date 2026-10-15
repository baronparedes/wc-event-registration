import { memo } from 'react';

import { Badge, BrandAvatar } from '@/components/ui';

import { DEFAULT_HELPER_PROMPTS } from '../constants';

export interface ChatEmptyStateProps {
  onSelectPrompt?: (prompt: string) => void;
  disabled?: boolean;
}

export const ChatEmptyState = memo(function ChatEmptyState({
  onSelectPrompt,
  disabled = false,
}: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted">
      <BrandAvatar size="md" className="mb-4" />
      <div className="flex items-center gap-2 mb-1">
        <p className="font-medium text-text">Hi! I'm your AI assistant.</p>
        <Badge
          variant="outline"
          className="border-secondary/50 bg-secondary/10 text-secondary text-xs font-semibold uppercase tracking-wider px-1.5 py-0.5"
        >
          Beta
        </Badge>
      </div>
      <p className="text-sm mb-6">Ask me questions about volunteers, schedules, and events.</p>

      {onSelectPrompt && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-xl">
          {DEFAULT_HELPER_PROMPTS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPrompt(item.prompt)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs sm:text-sm font-medium text-text shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true" className="shrink-0 text-base leading-none">
                {item.icon}
              </span>
              <span>{item.prompt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
