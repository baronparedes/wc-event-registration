import { AdminInfiniteScrollFooter } from '@/components/ui';

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
  if (filteredDataLength === 0) {
    return <div ref={loadMoreRef} className="h-1" />;
  }

  return (
    <AdminInfiniteScrollFooter
      currentCount={filteredDataLength}
      totalCount={filteredDataLength}
      summaryText={countBadgeLabel}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onFetchNextPage={onLoadMore}
      sentinelRef={loadMoreRef}
    />
  );
}
