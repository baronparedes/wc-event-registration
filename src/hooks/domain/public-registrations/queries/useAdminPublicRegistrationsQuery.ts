import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { PublicRegistrationSummary } from '@/lib/domain/public-registrations';
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure';

function escapeOrFilterValue(value: string): string {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

export const ADMIN_PUBLIC_REGISTRATIONS_QUERY_KEY = (eventId: string) =>
  ['admin-public-registrations', eventId] as const;

export const adminPublicRegistrationsInfiniteQueryKey = (
  eventId: string,
  pageSize: number,
  searchTerm: string,
) => [...ADMIN_PUBLIC_REGISTRATIONS_QUERY_KEY(eventId), pageSize, searchTerm] as const;

interface UseAdminPublicRegistrationsQueryParams {
  pageSize?: number;
  searchTerm?: string;
}

export interface AdminPublicRegistrationsPage {
  items: PublicRegistrationSummary[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

/**
 * Fetches public self-registrations for an event.
 * This is kept separate from member registrations because data comes from public registration tables.
 */
export function useAdminPublicRegistrationsQuery(
  eventId: string,
  params?: UseAdminPublicRegistrationsQueryParams,
) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminRegistrationsPageSize;
  const searchTerm = params?.searchTerm?.trim() ?? '';

  return useInfiniteQuery<AdminPublicRegistrationsPage, Error>({
    queryKey: adminPublicRegistrationsInfiniteQueryKey(eventId, pageSize, searchTerm),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: AdminPublicRegistrationsPage) => lastPage.nextCursor,
    enabled: Boolean(eventId),
    queryFn: async ({ pageParam }): Promise<AdminPublicRegistrationsPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      let query = supabase
        .from('public_registrations')
        .select('id, first_name, last_name, nickname, email, phone, status, submitted_at', {
          count: 'exact',
        })
        .eq('event_id', eventId)
        .order('submitted_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (searchTerm.length > 0) {
        const escapedSearchTerm = escapeOrFilterValue(searchTerm);
        query = query.or(
          `first_name.ilike.%${escapedSearchTerm}%,last_name.ilike.%${escapedSearchTerm}%,nickname.ilike.%${escapedSearchTerm}%,email.ilike.%${escapedSearchTerm}%`,
        );
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      const items = data ?? [];
      const totalCount = count ?? 0;
      const hasMore = offset + items.length < totalCount;

      return {
        items,
        nextCursor: hasMore ? String(offset + pageSize) : null,
        hasMore,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
      };
    },
    staleTime: QUERY_STALE_TIME_MS.immediate,
  });
}
