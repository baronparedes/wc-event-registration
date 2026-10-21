import { useQuery } from '@tanstack/react-query';

import {
  type ServiceWeeklyBrief,
  fetchServiceWeeklyBriefByDate,
  fetchServiceWeeklyBriefs,
} from '@/lib/domain/services';

export const SERVICE_WEEKLY_BRIEFS_QUERY_KEY = ['service_weekly_briefs'] as const;

export function useServiceWeeklyBriefByDateQuery(sundayDate?: string) {
  return useQuery({
    queryKey: [...SERVICE_WEEKLY_BRIEFS_QUERY_KEY, 'by-date', sundayDate],
    queryFn: async (): Promise<ServiceWeeklyBrief | null> => {
      if (!sundayDate) return null;
      return fetchServiceWeeklyBriefByDate(sundayDate);
    },
    enabled: Boolean(sundayDate),
    staleTime: 5 * 60 * 1000,
  });
}

export function useServiceWeeklyBriefsQuery(limit = 20) {
  return useQuery({
    queryKey: [...SERVICE_WEEKLY_BRIEFS_QUERY_KEY, 'list', limit],
    queryFn: async (): Promise<ServiceWeeklyBrief[]> => {
      return fetchServiceWeeklyBriefs(limit);
    },
    staleTime: 5 * 60 * 1000,
  });
}
