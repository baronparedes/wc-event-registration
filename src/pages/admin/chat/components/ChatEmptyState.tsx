import { memo } from 'react';

import { Badge, BrandAvatar } from '@/components/ui';

export const ChatEmptyState = memo(function ChatEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-muted">
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
      <p className="text-sm">Ask me questions about data and events.</p>
    </div>
  );
});
