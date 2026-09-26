import { useMutation } from '@tanstack/react-query';

import {
  type CommitmentDashboardStat,
  buildCommitmentDashboardCsvExport,
  fetchAllCommitmentDashboardStatsForExport,
} from '@/lib/domain/services';

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
    wi_5th_sunday: Number(item.wi_5th_sunday ?? 0),
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
      // 1-2. Fetch first page for total count, then remaining pages in parallel
      const rawItems = await fetchAllCommitmentDashboardStatsForExport(filters, EXPORT_PAGE_SIZE);
      const allStats: CommitmentDashboardStat[] = rawItems.map(mapRawItemToCommitmentDashboardStat);

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
