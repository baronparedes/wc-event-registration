import { memo, useEffect, useRef } from 'react';

import { Check } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
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
      className={`flex min-h-14 items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10' : 'hover:bg-background'
      }`}
      onMouseDown={(e) => {
        // Prevent input blur before click registers
        e.preventDefault();
        onSelect(candidate);
      }}
    >
      <Avatar
        name={candidate.fullName || candidate.name}
        avatarObjectKey={candidate.avatarObjectKey}
        size="sm"
        className="shrink-0"
      />
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className={`text-sm leading-tight truncate ${
            isSelected ? 'font-semibold text-primary' : 'font-medium text-text'
          }`}
        >
          {candidate.name}
        </span>
        {displaySubtitle && <span className="text-xs text-muted truncate">{displaySubtitle}</span>}
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />}
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
        className="absolute bottom-full mb-2 left-0 w-full sm:max-w-xl rounded-xl border border-border bg-surface p-4 shadow-lg z-20"
        role="listbox"
        aria-label="Mention members"
      >
        <p className="text-xs text-muted text-center">No matching members found</p>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-full mb-2 left-0 w-full sm:max-w-xl rounded-xl border border-border bg-surface shadow-lg z-20 overflow-hidden"
      role="listbox"
      aria-label="Mention members"
    >
      <div className="px-3 py-1.5 text-[11px] font-medium text-muted uppercase tracking-wider border-b border-border/50 bg-background/50 flex items-center justify-between">
        <span>Mention Member</span>
        <span className="text-[10px] lowercase text-muted/80">↑↓ to navigate · ↵ to select</span>
      </div>
      <ul className="max-h-[min(45vh,24rem)] overflow-y-auto divide-y divide-border/20">
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
