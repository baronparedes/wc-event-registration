import { useMutation } from '@tanstack/react-query';

import {
  type CommitmentDashboardStat,
  buildCommitmentDashboardCsvExport,
} from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export interface ExportCommitmentDashboardStatsCSVParams {
  start_date: string;
  end_date: string;
  excuse_event_id?: string | null;
  search_query?: string;
  role?: string;
  category?: string;
  timeframe?: string;
}

export interface ExportCommitmentDashboardStatsCSVResult {
  csvText: string;
  filename: string;
  totalCount: number;
}

const EXPORT_PAGE_SIZE = 500;

function mapRawItemToCommitmentDashboardStat(
  item: Record<string, unknown>,
): CommitmentDashboardStat {
  return {
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
    attendance_score: Number(item.attendance_score),
  };
}

export function useExportCommitmentDashboardStatsCSVMutation() {
  return useMutation<
    ExportCommitmentDashboardStatsCSVResult,
    Error,
    ExportCommitmentDashboardStatsCSVParams
  >({
    mutationFn: async (filters) => {
      // 1. Fetch initial page to get total count
      const { data: firstPageData, error: firstPageError } = await supabase.rpc(
        'get_commitment_dashboard_stats',
        {
          p_start_date: filters.start_date,
          p_end_date: filters.end_date,
          p_excuse_event_id: filters.excuse_event_id || null,
          p_search_query: filters.search_query || null,
          p_role: filters.role || null,
          p_category: filters.category || null,
          p_page: 1,
          p_page_size: EXPORT_PAGE_SIZE,
        },
      );

      if (firstPageError) {
        throw new Error(
          `Failed to fetch commitment dashboard stats for export: ${firstPageError.message}`,
        );
      }

      const rawFirstPageItems = (firstPageData ?? []) as Record<string, unknown>[];
      const totalCount =
        rawFirstPageItems.length > 0 ? Number(rawFirstPageItems[0].total_count) : 0;

      const allStats: CommitmentDashboardStat[] = rawFirstPageItems.map(
        mapRawItemToCommitmentDashboardStat,
      );

      // 2. If there are more pages, fetch remaining pages in parallel
      const totalPages = Math.ceil(totalCount / EXPORT_PAGE_SIZE);
      if (totalPages > 1) {
        const remainingPagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          remainingPagePromises.push(
            supabase.rpc('get_commitment_dashboard_stats', {
              p_start_date: filters.start_date,
              p_end_date: filters.end_date,
              p_excuse_event_id: filters.excuse_event_id || null,
              p_search_query: filters.search_query || null,
              p_role: filters.role || null,
              p_category: filters.category || null,
              p_page: page,
              p_page_size: EXPORT_PAGE_SIZE,
            }),
          );
        }

        const remainingResults = await Promise.all(remainingPagePromises);
        for (const res of remainingResults) {
          if (res.error) {
            throw new Error(
              `Failed to fetch commitment dashboard stats page for export: ${res.error.message}`,
            );
          }
          const rawItems = (res.data ?? []) as Record<string, unknown>[];
          allStats.push(...rawItems.map(mapRawItemToCommitmentDashboardStat));
        }
      }

      // 3. Build CSV string & filename
      const { csvText, filename } = buildCommitmentDashboardCsvExport({
        stats: allStats,
        startDate: filters.start_date,
        endDate: filters.end_date,
        timeframe: filters.timeframe,
      });

      return {
        csvText,
        filename,
        totalCount: allStats.length,
      };
    },
  });
}
