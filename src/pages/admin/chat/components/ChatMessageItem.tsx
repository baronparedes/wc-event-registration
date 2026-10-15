import { memo, useMemo } from 'react';

import { Avatar, BrandAvatar, Spinner } from '@/components/ui';
import { useResolveUserTokensQuery } from '@/hooks/domain/chat';
import { untokenizeUserText } from '@/lib/domain/chat';

import type { ChatMessageItemData } from '../types';
import { ChatMessageContent } from './ChatMessageContent';
import { CopyButton } from './CopyButton';

export type { ChatMessageItemData };

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
  const { data: tokenMap = {} } = useResolveUserTokensQuery();

  const userDisplayContent = useMemo(() => {
    if (!isUser) return message.content;
    return untokenizeUserText(message.content, tokenMap);
  }, [isUser, message.content, tokenMap]);

  return (
    <div
      className={`flex ${
        isUser
          ? 'justify-end sm:justify-start sm:flex-row-reverse sm:gap-3'
          : 'justify-start sm:flex-row sm:gap-3'
      }`}
    >
      {/* Avatar (hidden on mobile, side on desktop) */}
      <div className="hidden sm:block shrink-0">
        {isUser ? (
          <Avatar
            name={displayName}
            avatarObjectKey={avatarObjectKey}
            size="sm"
            className="h-8 w-8 text-xs"
          />
        ) : (
          <BrandAvatar size="xs" />
        )}
      </div>

      {/* Message content container */}
      <div
        className={`flex flex-col gap-1 ${
          isUser ? 'max-w-[88%] sm:max-w-[85%]' : 'w-full sm:max-w-[85%]'
        }`}
      >
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-primary text-white sm:rounded-tr-none'
              : 'bg-background border border-border sm:rounded-tl-none shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{userDisplayContent}</p>
          ) : message.content.trim() ? (
            <ChatMessageContent content={message.content} />
          ) : (
            <Spinner size="sm" className="text-muted" />
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
