import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure';

export interface CommitmentDashboardFilters {
  start_date: string;
  end_date: string;
  excuse_event_id?: string;
  search_query?: string;
  role?: string;
  category?: string;
}

export interface CommitmentDashboardStat {
  user_id: string;
  member_id: string;
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
    enabled: Boolean(filters.start_date && filters.end_date && filters.excuse_event_id),
    queryFn: async ({ pageParam }): Promise<CommitmentDashboardStatsPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      const page = Math.floor(offset / pageSize) + 1;

      const { data, error } = await supabase.rpc('get_commitment_dashboard_stats', {
        p_start_date: filters.start_date,
        p_end_date: filters.end_date,
        p_excuse_event_id: filters.excuse_event_id!,
        p_search_query: filters.search_query || null,
        p_role: filters.role || null,
        p_category: filters.category || null,
        p_page: page,
        p_page_size: pageSize,
      });

      if (error) {
        throw new Error(`Failed to fetch commitment dashboard stats: ${error.message}`);
      }

      const rawItems = (data ?? []) as Record<string, unknown>[];
      const totalCount = rawItems.length > 0 ? Number(rawItems[0].total_count) : 0;

      const items: CommitmentDashboardStat[] = rawItems.map((item) => ({
        user_id: item.user_id as string,
        member_id: item.member_id as string,
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
