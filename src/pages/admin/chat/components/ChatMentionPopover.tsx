import { memo } from 'react';

import { User } from 'lucide-react';

import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';

export interface ChatMentionPopoverProps {
  candidates: ResolvedToken[];
  selectedIndex: number;
  onSelect: (user: ResolvedToken) => void;
}

export const ChatMentionPopover = memo(function ChatMentionPopover({
  candidates,
  selectedIndex,
  onSelect,
}: ChatMentionPopoverProps) {
  if (candidates.length === 0) {
    return (
      <div
        className="absolute bottom-full mb-2 left-0 w-full sm:max-w-sm rounded-xl border border-border bg-surface p-3 shadow-lg z-20"
        role="listbox"
        aria-label="Mention members"
      >
        <p className="text-xs text-muted text-center">No matching members found</p>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-full mb-2 left-0 w-full sm:max-w-sm rounded-xl border border-border bg-surface py-1.5 shadow-lg z-20 overflow-hidden"
      role="listbox"
      aria-label="Mention members"
    >
      <div className="px-3 py-1 text-[11px] font-medium text-muted uppercase tracking-wider border-b border-border/50 flex items-center justify-between">
        <span>Mention Member</span>
        <span className="text-[10px] lowercase text-muted/80">↑↓ to navigate · ↵ to select</span>
      </div>
      <ul className="max-h-52 overflow-y-auto divide-y divide-border/20">
        {candidates.map((candidate, index) => {
          const isSelected = index === selectedIndex;
          const displaySubtitle =
            candidate.nickname && candidate.nickname !== candidate.name
              ? `"${candidate.nickname}"`
              : candidate.fullName && candidate.fullName !== candidate.name
                ? candidate.fullName
                : null;

          return (
            <li
              key={candidate.id}
              role="option"
              aria-selected={isSelected}
              className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                isSelected ? 'bg-primary/10 text-text font-medium' : 'text-text hover:bg-muted/15'
              }`}
              onMouseDown={(e) => {
                // Prevent input blur before click registers
                e.preventDefault();
                onSelect(candidate);
              }}
            >
              <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-semibold">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs truncate font-medium text-text">{candidate.name}</span>
                {displaySubtitle && (
                  <span className="text-[10px] text-muted truncate">{displaySubtitle}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});
