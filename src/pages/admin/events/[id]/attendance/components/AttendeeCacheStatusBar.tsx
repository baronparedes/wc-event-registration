import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';

type AttendeeCacheStatusBarProps = {
  message: string | null;
  isError?: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
  className?: string;
};

export function AttendeeCacheStatusBar(props: AttendeeCacheStatusBarProps) {
  const { message, isError = false, isRefreshing = false, onRefresh, className = '' } = props;

  const wrapperClassName = [
    'flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] leading-tight text-muted',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapperClassName}>
      <span className={`min-w-0 flex-1 truncate ${isError ? 'text-red-600' : ''}`.trim()}>
        {message}
      </span>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        aria-label={isRefreshing ? 'Refreshing attendee cache' : 'Refresh attendee cache'}
        aria-busy={isRefreshing}
        title={isRefreshing ? 'Refreshing...' : 'Refresh'}
        onClick={onRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
      </Button>
    </div>
  );
}
