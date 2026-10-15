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
      />

      <AdminPageShell.Content isLoading={false} loadingMessage="">
        <div className="flex h-[calc(100vh-14rem)] min-h-[520px] max-h-[920px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2.5 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium text-text">AI Assistant</span>
              <span className="text-[11px] text-muted">
                {messages.length > 0
                  ? `${messages.length} message${messages.length === 1 ? '' : 's'}`
                  : 'Ready'}
              </span>
            </div>

            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="xs"
                onClick={handleClearChat}
                disabled={isLoading}
                className="h-7 gap-1.5 px-2 text-xs text-muted hover:text-text hover:bg-muted/10 transition-colors"
                aria-label="Clear chat"
                title="Clear current conversation"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear Chat</span>
              </Button>
            )}
          </div>
          <ChatMessageList
            messages={messages}
            displayName={displayName}
            avatarObjectKey={avatarObjectKey}
            isLoading={isLoading}
            scrollRef={scrollRef}
            bottomRef={bottomRef}
            onSelectPrompt={handleSendMessage}
          />

          <div className="border-t border-border bg-background px-3 py-2 sm:px-4 sm:py-2.5">
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
