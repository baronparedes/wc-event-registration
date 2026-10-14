import { keepPreviousData, useQuery } from '@tanstack/react-query';

import {
  type MissedServiceCommitment,
  type MissedServiceCommitmentsArgs,
  fetchMissedServiceCommitments,
} from '@/lib/domain/services';

export interface MissedServiceCommitmentsFilters {
  year?: number | null;
  month?: number | null;
  sunday_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  time_slot?: string | null;
  role?: string | null;
  excuse_event_id?: string | null;
  search_query?: string | null;
}

export const missedServiceCommitmentsQueryKey = (filters: MissedServiceCommitmentsFilters) =>
  ['missed-service-commitments', filters] as const;

export function useMissedServiceCommitmentsQuery(
  filters: MissedServiceCommitmentsFilters,
  enabled = true,
) {
  const isFilterActive = Boolean(
    filters.sunday_date || filters.year || (filters.start_date && filters.end_date),
  );

  return useQuery<MissedServiceCommitment[]>({
    queryKey: missedServiceCommitmentsQueryKey(filters),
    placeholderData: keepPreviousData,
    enabled: enabled && isFilterActive,
    queryFn: async (): Promise<MissedServiceCommitment[]> => {
      const args: MissedServiceCommitmentsArgs = {};

      if (filters.sunday_date) {
        args.p_sunday_date = filters.sunday_date;
      } else if (filters.start_date && filters.end_date) {
        args.p_start_date = filters.start_date;
        args.p_end_date = filters.end_date;
      } else if (filters.year) {
        args.p_year = filters.year;
        if (filters.month) {
          args.p_month = filters.month;
        }
      }

      if (filters.time_slot && filters.time_slot !== 'All') {
        args.p_time_slot = filters.time_slot;
      }

      if (filters.role && filters.role !== 'All Roles') {
        args.p_role = filters.role;
      }

      if (filters.excuse_event_id) {
        args.p_excuse_event_id = filters.excuse_event_id;
      }

      if (filters.search_query) {
        args.p_search_query = filters.search_query;
      }

      return fetchMissedServiceCommitments(args);
    },
  });
}
