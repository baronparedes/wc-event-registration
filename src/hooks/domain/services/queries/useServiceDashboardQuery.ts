import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { fetchServiceDashboardStats } from '@/lib/domain/services';

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
    '9AM': TimeSlotStats;
    '12NN': TimeSlotStats;
    '3PM': TimeSlotStats;
  };
  roles: string[];
}

export const serviceDashboardQueryKey = (filters: DashboardStatsFilters) =>
  ['service-dashboard-stats', filters] as const;

const DEFAULT_SLOT_STATS: TimeSlotStats = {
  committed: 0,
  present: 0,
  walk_ins: 0,
  late_tardy: 0,
  roles: {},
};

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

      const data = await fetchServiceDashboardStats(args);

      const response = (data ?? {}) as {
        time_slots?: Record<string, TimeSlotStats>;
        roles?: string[];
      };
      const rawSlots = response.time_slots ?? {};

      return {
        time_slots: {
          '9AM': rawSlots['9AM'] ?? rawSlots['9:00 AM'] ?? DEFAULT_SLOT_STATS,
          '12NN': rawSlots['12NN'] ?? DEFAULT_SLOT_STATS,
          '3PM': rawSlots['3PM'] ?? rawSlots['3:00 PM'] ?? DEFAULT_SLOT_STATS,
        },
        roles: response.roles ?? [],
      };
    },
  });
}
