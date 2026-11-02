import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_KEYS, QUERY_STALE_TIME_MS } from '@/config/constants';
import { fetchAdminRecruitmentApplicationsPage } from '@/lib/domain/recruitment';
import type { RecruitmentApplication } from '@/lib/domain/recruitment';
import { decodeOffsetCursor, getTotalPages } from '@/lib/infrastructure';

type AdminRecruitmentApplicationsParams = {
  pageSize?: number;
  searchTerm?: string;
  status?: RecruitmentApplication['status'];
};

export type AdminRecruitmentApplicationsPage = {
  items: RecruitmentApplication[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
};

export function adminRecruitmentApplicationsInfiniteQueryKey(
  pageSize: number,
  searchTerm: string,
  status: RecruitmentApplication['status'] | undefined,
) {
  return [
    ...QUERY_KEYS.adminRecruitmentApplications(),
    pageSize,
    searchTerm,
    status ?? 'all',
  ] as const;
}

export function useAdminRecruitmentApplicationsInfiniteQuery(
  params?: AdminRecruitmentApplicationsParams,
) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminRegistrationsPageSize;
  const searchTerm = params?.searchTerm?.trim() ?? '';
  const status = params?.status;

  return useInfiniteQuery<AdminRecruitmentApplicationsPage, Error>({
    queryKey: adminRecruitmentApplicationsInfiniteQueryKey(pageSize, searchTerm, status),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }): Promise<AdminRecruitmentApplicationsPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      const { rows, count } = await fetchAdminRecruitmentApplicationsPage({
        offset,
        pageSize,
        searchTerm,
        status,
      });
      const totalCount = count ?? 0;
      const hasMore = offset + rows.length < totalCount;

      return {
        items: rows,
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
