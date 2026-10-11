import { type RefObject, memo } from 'react';

import type { ChatMessageItemData } from '../types';
import { ChatEmptyState } from './ChatEmptyState';
import { ChatMessageItem } from './ChatMessageItem';

export interface ChatMessageListProps {
  messages: ChatMessageItemData[];
  displayName: string;
  avatarObjectKey?: string | null;
  isLoading: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  bottomRef: RefObject<HTMLDivElement | null>;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  displayName,
  avatarObjectKey,
  isLoading,
  scrollRef,
  bottomRef,
}: ChatMessageListProps) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {messages.length === 0 && <ChatEmptyState />}
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
  );
});
