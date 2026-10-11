import { RotateCcw } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Badge, Button } from '@/components/ui';

import { ChatInputForm, ChatMessageList } from './components';
import { useAdminChatController } from './hooks';

export function AdminChatPage() {
  const {
    messages,
    isLoading,
    userTokenMap,
    displayName,
    avatarObjectKey,
    scrollRef,
    bottomRef,
    handleSendMessage,
    handleClearChat,
    stopStream,
  } = useAdminChatController();

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Hello!' }]}
        title="AI Assistant"
        badge={
          <Badge
            variant="outline"
            className="border-secondary/50 bg-secondary/10 text-secondary text-xs font-semibold uppercase tracking-wider px-2 py-0.5"
          >
            Beta
          </Badge>
        }
        description={
          <span className="text-xs opacity-90 leading-relaxed italic block">
            AI responses can be inaccurate. Always verify critical data independently. This tool is
            for informational purposes and does not replace human judgment.
          </span>
        }
        actions={
          messages.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              disabled={isLoading}
              className="gap-1.5"
              aria-label="Clear chat"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear Chat</span>
            </Button>
          ) : undefined
        }
      />

      <AdminPageShell.Content isLoading={false} loadingMessage="">
        <div className="flex h-[calc(100vh-14rem)] min-h-[520px] max-h-[820px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <ChatMessageList
            messages={messages}
            displayName={displayName}
            avatarObjectKey={avatarObjectKey}
            isLoading={isLoading}
            scrollRef={scrollRef}
            bottomRef={bottomRef}
          />

          <div className="border-t border-border bg-background p-4">
            <ChatInputForm
              isLoading={isLoading}
              onSubmit={handleSendMessage}
              onStop={stopStream}
              tokenMap={userTokenMap}
            />
          </div>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
