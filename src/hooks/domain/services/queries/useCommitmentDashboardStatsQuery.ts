import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchCommitmentDashboardStatsPage } from '@/lib/domain/services';
import { decodeOffsetCursor, getTotalPages } from '@/lib/infrastructure';

export interface CommitmentDashboardFilters {
  start_date: string;
  end_date: string;
  excuse_event_id?: string | null;
  search_query?: string;
  role?: string;
  category?: string;
}

export interface CommitmentDashboardStat {
  user_id: string;
  member_id: string;
  avatar_object_key: string | null;
  full_name: string;
  nickname: string;
  email: string;
  role: string;
  category: string;
  start_date: string;
  committed: number;
  attended: number;
  absences: number;
  excused: number;
  wi_9am_3pm: number;
  wi_12nn: number;
  wi_5th_sunday: number;
  attendance_score: number;
}

export interface CommitmentDashboardStatsPage {
  items: CommitmentDashboardStat[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

export const commitmentDashboardStatsQueryKey = (filters: CommitmentDashboardFilters) =>
  ['commitment-dashboard-stats', filters] as const;

export function useCommitmentDashboardStatsQuery(
  filters: CommitmentDashboardFilters,
  pageSize: number = PAGINATION_DEFAULTS.adminServiceAttendancePageSize,
) {
  return useInfiniteQuery<CommitmentDashboardStatsPage, Error>({
    queryKey: [...commitmentDashboardStatsQueryKey(filters), pageSize] as const,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: CommitmentDashboardStatsPage) => lastPage.nextCursor,
    enabled: Boolean(filters.start_date && filters.end_date),
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }): Promise<CommitmentDashboardStatsPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      const page = Math.floor(offset / pageSize) + 1;

      const rawItems = await fetchCommitmentDashboardStatsPage(filters, page, pageSize);
      const totalCount = rawItems.length > 0 ? Number(rawItems[0].total_count) : 0;

      const items: CommitmentDashboardStat[] = rawItems.map((item) => ({
        user_id: item.user_id as string,
        member_id: item.member_id as string,
        avatar_object_key: (item.avatar_object_key as string) ?? null,
        full_name: item.full_name as string,
        nickname: item.nickname as string,
        email: item.email as string,
        role: item.role as string,
        category: item.category as string,
        start_date: item.start_date as string,
        committed: Number(item.committed),
        attended: Number(item.attended),
        absences: Number(item.absences),
        excused: Number(item.excused),
        wi_9am_3pm: Number(item.wi_9am_3pm),
        wi_12nn: Number(item.wi_12nn),
        wi_5th_sunday: Number(item.wi_5th_sunday ?? 0),
        attendance_score: Number(item.attendance_score),
      }));

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
