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
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium text-primary underline underline-offset-2 hover:no-underline disabled:opacity-50"
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
