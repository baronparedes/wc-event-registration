import type { ReactNode, Ref } from 'react';

import { formatPaginationSummary } from '@/lib/infrastructure';

import { Button } from './Button';
import { Spinner } from './Spinner';

export interface AdminInfiniteScrollFooterProps {
  currentCount: number;
  totalCount: number;
  entityName?: string;
  pluralEntityName?: string;
  summaryText?: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onFetchNextPage?: () => void;
  sentinelRef?: Ref<HTMLDivElement>;
  className?: string;
  actions?: ReactNode;
}

/**
 * Standardized infinite scroll summary, load-more trigger, and sentinel element.
 */

export function AdminInfiniteScrollFooter({
  currentCount,
  totalCount,
  entityName = 'item',
  pluralEntityName,
  summaryText,
  hasNextPage = false,
  isFetchingNextPage = false,
  onFetchNextPage,
  sentinelRef,
  className = 'flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6',
  actions,
}: AdminInfiniteScrollFooterProps) {
  const displaySummary =
    summaryText ??
    formatPaginationSummary(hasNextPage, currentCount, totalCount, entityName, pluralEntityName);

  return (
    <>
      <div className={className}>
        <p className="text-xs text-muted">{displaySummary}</p>

        <div className="flex items-center gap-2">
          {actions}
          {hasNextPage && onFetchNextPage && (
            <Button
              type="button"
              variant="primaryOutline"
              size="sm"
              onClick={onFetchNextPage}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" aria-hidden="true" />
                  Loading...
                </span>
              ) : (
                'Load More'
              )}
            </Button>
          )}
        </div>
      </div>
      {sentinelRef && <div ref={sentinelRef} className="h-1" />}
    </>
  );
}
