import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminForm } from '@/lib/domain/forms';
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure';

export const ADMIN_FORMS_QUERY_KEY = ['admin-forms'] as const;

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export const adminFormsInfiniteQueryKey = (pageSize: number, searchTerm: string) =>
  [...ADMIN_FORMS_QUERY_KEY, pageSize, searchTerm] as const;

export interface AdminFormsPageParams {
  pageSize?: number;
  searchTerm?: string;
}

export interface AdminFormsPage {
  items: AdminForm[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

export function useAdminFormsQuery(params?: AdminFormsPageParams) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminEventsPageSize;
  const searchTerm = params?.searchTerm?.trim() ?? '';

  return useInfiniteQuery<AdminFormsPage, Error>({
    queryKey: adminFormsInfiniteQueryKey(pageSize, searchTerm),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: AdminFormsPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }): Promise<AdminFormsPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      let formsQuery = supabase.from('forms').select('*', { count: 'exact' });

      if (searchTerm.length > 0) {
        const escapedSearchTerm = escapeOrFilterValue(searchTerm);
        formsQuery = formsQuery.or(
          `title.ilike.%${escapedSearchTerm}%,slug.ilike.%${escapedSearchTerm}%`,
        );
      }

      const { data, error, count } = await formsQuery
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      const items = (data ?? []) as AdminForm[];
      const totalCount = count ?? 0;
      const hasMore = offset + items.length < totalCount;

      return {
        items,
        hasMore,
        nextCursor: hasMore ? String(offset + pageSize) : null,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
      };
    },
    staleTime: QUERY_STALE_TIME_MS.immediate,
  });
}
