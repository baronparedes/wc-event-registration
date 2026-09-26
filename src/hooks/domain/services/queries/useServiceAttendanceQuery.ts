import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { type ServiceAttendance, fetchServiceAttendancePage } from '@/lib/domain/services';
import { decodeOffsetCursor, getTotalPages } from '@/lib/infrastructure';

export interface FetchServiceAttendanceFilters {
  start_date?: string;
  end_date?: string;
  time_slot?: string;
  is_walk_in?: boolean;
  is_override?: boolean;
  user_id?: string;
  rfid?: string;
}

export interface ServiceAttendancePage {
  items: ServiceAttendance[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

export const serviceAttendanceQueryKey = (filters: FetchServiceAttendanceFilters) =>
  ['service-attendance', filters] as const;

export function useServiceAttendanceQuery(
  filters: FetchServiceAttendanceFilters = {},
  pageSize: number = PAGINATION_DEFAULTS.adminServiceAttendancePageSize,
) {
  return useInfiniteQuery<ServiceAttendancePage, Error>({
    queryKey: [...serviceAttendanceQueryKey(filters), pageSize] as const,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: ServiceAttendancePage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }): Promise<ServiceAttendancePage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);

      const { rows, count } = await fetchServiceAttendancePage({ offset, pageSize, filters });

      const totalCount = count ?? 0;
      const items: ServiceAttendance[] = rows;
      const hasMore = offset + items.length < totalCount;

      return {
        items,
        hasMore,
        nextCursor: hasMore ? String(offset + pageSize) : null,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
      };
    },
    staleTime: QUERY_STALE_TIME_MS.adminList,
    refetchOnWindowFocus: false,
  });
}
