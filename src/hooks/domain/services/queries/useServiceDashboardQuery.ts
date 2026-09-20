import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export interface DashboardStatsFilters {
  year?: number | null;
  month?: number | null;
  sunday_date?: string | null; // YYYY-MM-DD
}

export interface TimeSlotStats {
  committed: number;
  present: number;
  walk_ins: number;
  late_tardy: number;
  roles: Record<string, number>;
}

export interface DashboardStatsResponse {
  time_slots: {
    '9:00 AM': TimeSlotStats;
    '12NN': TimeSlotStats;
    '3:00 PM': TimeSlotStats;
  };
  roles: string[];
}

export const serviceDashboardQueryKey = (filters: DashboardStatsFilters) =>
  ['service-dashboard-stats', filters] as const;

export function useServiceDashboardQuery(filters: DashboardStatsFilters) {
  return useQuery({
    queryKey: serviceDashboardQueryKey(filters),
    placeholderData: keepPreviousData,
    enabled: !!filters.sunday_date || !!filters.year,
    queryFn: async (): Promise<DashboardStatsResponse> => {
      const args: { p_year?: number; p_month?: number; p_sunday_date?: string } = {};

      if (filters.sunday_date) {
        args.p_sunday_date = filters.sunday_date;
      } else if (filters.year) {
        args.p_year = filters.year;
        if (filters.month) {
          args.p_month = filters.month;
        }
      }

      const { data, error } = await supabase.rpc('get_service_dashboard_stats', args);

      if (error) {
        throw new Error(`Failed to fetch service dashboard stats: ${error.message}`);
      }

      // The RPC returns a single jsonb object representing DashboardStatsResponse
      return data as DashboardStatsResponse;
    },
  });
}
