import { memo, useEffect, useRef } from 'react';

import { User } from 'lucide-react';

import type { ResolvedToken } from '@/hooks/domain/chat/queries/useResolveUserTokensQuery';

export interface ChatMentionPopoverProps {
  candidates: ResolvedToken[];
  selectedIndex: number;
  onSelect: (user: ResolvedToken) => void;
  onHighlight?: (index: number) => void;
}

interface MentionOptionItemProps {
  candidate: ResolvedToken;
  isSelected: boolean;
  onSelect: (user: ResolvedToken) => void;
  onHighlight?: () => void;
}

const MentionOptionItem = memo(function MentionOptionItem({
  candidate,
  isSelected,
  onSelect,
  onHighlight,
}: MentionOptionItemProps) {
  const itemRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isSelected]);

  const displaySubtitle =
    candidate.nickname && candidate.nickname !== candidate.name
      ? `"${candidate.nickname}"`
      : candidate.fullName && candidate.fullName !== candidate.name
        ? candidate.fullName
        : null;

  return (
    <li
      ref={itemRef}
      role="option"
      aria-selected={isSelected}
      onMouseEnter={onHighlight}
      className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary text-white font-semibold shadow-xs' : 'text-text hover:bg-muted/15'
      }`}
      onMouseDown={(e) => {
        // Prevent input blur before click registers
        e.preventDefault();
        onSelect(candidate);
      }}
    >
      <div
        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
          isSelected ? 'bg-white/25 text-white' : 'bg-primary/20 text-primary'
        }`}
      >
        <User className="h-3.5 w-3.5" />
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={`text-xs truncate ${isSelected ? 'text-white font-semibold' : 'font-medium text-text'}`}
        >
          {candidate.name}
        </span>
        {displaySubtitle && (
          <span className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-muted'}`}>
            {displaySubtitle}
          </span>
        )}
      </div>
      {isSelected && (
        <span className="text-[10px] text-white/90 bg-white/20 rounded px-1.5 py-0.5 shrink-0 font-normal">
          ↵ Select
        </span>
      )}
    </li>
  );
});

export const ChatMentionPopover = memo(function ChatMentionPopover({
  candidates,
  selectedIndex,
  onSelect,
  onHighlight,
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
        {candidates.map((candidate, index) => (
          <MentionOptionItem
            key={candidate.id}
            candidate={candidate}
            isSelected={index === selectedIndex}
            onSelect={onSelect}
            onHighlight={onHighlight ? () => onHighlight(index) : undefined}
          />
        ))}
      </ul>
    </div>
  );
});
