import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { AdminEvent } from '@/lib/domain/events';
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure';

export const ADMIN_EVENTS_QUERY_KEY = ['admin-events'] as const;

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export const adminEventsInfiniteQueryKey = (pageSize: number, searchTerm: string) =>
  [...ADMIN_EVENTS_QUERY_KEY, pageSize, searchTerm] as const;

export interface AdminEventsPageParams {
  pageSize?: number;
  searchTerm?: string;
}

export interface AdminEventsPage {
  items: AdminEvent[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

/** Fetches infinite events ordered by start date descending for admin management. */
export function useAdminEventsQuery(params?: AdminEventsPageParams) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminEventsPageSize;
  const searchTerm = params?.searchTerm?.trim() ?? '';

  return useInfiniteQuery<AdminEventsPage, Error>({
    queryKey: adminEventsInfiniteQueryKey(pageSize, searchTerm),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: AdminEventsPage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }): Promise<AdminEventsPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      let eventsQuery = supabase.from('events').select('*', { count: 'exact' });

      if (searchTerm.length > 0) {
        const escapedSearchTerm = escapeOrFilterValue(searchTerm);
        eventsQuery = eventsQuery.or(
          `title.ilike.%${escapedSearchTerm}%,slug.ilike.%${escapedSearchTerm}%`,
        );
      }

      const { data, error, count } = await eventsQuery
        .order('starts_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      const items = (data ?? []) as AdminEvent[];
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
