import { memo } from 'react';

import { Loader2 } from 'lucide-react';

import { Avatar, BrandAvatar } from '@/components/ui';

import { ChatMessageContent } from './ChatMessageContent';
import { CopyButton } from './CopyButton';

export type ChatMessageItemData = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

interface ChatMessageItemProps {
  message: ChatMessageItemData;
  displayName: string;
  avatarObjectKey?: string | null;
  isLoading?: boolean;
}

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
  displayName,
  avatarObjectKey,
  isLoading = false,
}: ChatMessageItemProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {isUser ? (
        <Avatar
          name={displayName}
          avatarObjectKey={avatarObjectKey}
          size="sm"
          className="h-8 w-8 shrink-0 text-xs"
        />
      ) : (
        <BrandAvatar size="xs" />
      )}
      <div className="flex flex-col gap-1 max-w-[90%] sm:max-w-[85%]">
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-primary text-white rounded-tr-none'
              : 'bg-background border border-border rounded-tl-none shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{message.content}</p>
          ) : message.content.trim() ? (
            <ChatMessageContent content={message.content} />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
          )}
        </div>
        {!isUser && message.content.trim() && !isLoading && (
          <div className="flex px-1">
            <CopyButton content={message.content} />
          </div>
        )}
      </div>
    </div>
  );
});
