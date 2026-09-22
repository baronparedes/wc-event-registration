import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export interface AttendanceTableFooterProps {
  filteredDataLength: number;
  countBadgeLabel: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  onLoadMore: () => void;
}

export function AttendanceTableFooter({
  filteredDataLength,
  countBadgeLabel,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
  onLoadMore,
}: AttendanceTableFooterProps) {
  return (
    <>
      {filteredDataLength > 0 && (
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-muted">{countBadgeLabel}</p>
          {hasNextPage && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primaryOutline"
                size="sm"
                onClick={onLoadMore}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
      {/* IntersectionObserver sentinel for auto-loading */}
      <div ref={loadMoreRef} className="h-1" />
    </>
  );
}
