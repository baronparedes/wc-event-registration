import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  type AdminRegistrationWithMember,
  type RegistrationAnswerCount,
  fetchEventRegistrationsPage,
  fetchRegistrationMembersByIds,
  searchRegistrationUserIds,
} from '@/lib/domain/registrations';
import { decodeOffsetCursor, getTotalPages } from '@/lib/infrastructure';

function readMetadataString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readAnswerCount(value: RegistrationAnswerCount[] | null | undefined): number {
  const count = value?.[0]?.count;
  return typeof count === 'number' ? count : 0;
}

export const ADMIN_REGISTRATIONS_QUERY_KEY = (eventId: string) =>
  ['admin-registrations', eventId] as const;

export const adminRegistrationsInfiniteQueryKey = (
  eventId: string,
  pageSize: number,
  searchTerm: string,
) => [...ADMIN_REGISTRATIONS_QUERY_KEY(eventId), pageSize, searchTerm] as const;

export interface AdminRegistrationsPageParams {
  pageSize?: number;
  searchTerm?: string;
}

export interface AdminRegistrationsPage {
  items: AdminRegistrationWithMember[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

/**
 * Fetches infinite registrations for an event with member details.
 * Joins registrations + users + counts answers for display in list view.
 */
export function useAdminRegistrationsQuery(eventId: string, params?: AdminRegistrationsPageParams) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminRegistrationsPageSize;
  const searchTerm = params?.searchTerm?.trim() ?? '';

  return useInfiniteQuery<AdminRegistrationsPage, Error>({
    queryKey: adminRegistrationsInfiniteQueryKey(eventId, pageSize, searchTerm),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: AdminRegistrationsPage) => lastPage.nextCursor,
    enabled: Boolean(eventId),
    queryFn: async ({ pageParam }): Promise<AdminRegistrationsPage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);
      let matchingUserIds: string[] | undefined;

      if (searchTerm.length > 0) {
        matchingUserIds = await searchRegistrationUserIds(searchTerm);
        if (matchingUserIds.length === 0) {
          return {
            items: [],
            nextCursor: null,
            hasMore: false,
            totalCount: 0,
            totalPages: getTotalPages(0, pageSize),
          };
        }
      }

      const { rows: typedRegistrations, count } = await fetchEventRegistrationsPage({
        eventId,
        offset,
        pageSize,
        userIds: matchingUserIds,
      });
      const totalCount = count ?? 0;

      if (typedRegistrations.length === 0) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          totalCount,
          totalPages: getTotalPages(totalCount, pageSize),
        };
      }

      // Fetch user details for all registrations
      const userIds = [...new Set(typedRegistrations.map((r) => r.user_id))];
      const users = await fetchRegistrationMembersByIds(userIds);

      // Build user map for quick lookup
      const userMap = new Map(users.map((u) => [u.id, u]));

      // Combine data
      const items = typedRegistrations.map((r) => {
        const user = userMap.get(r.user_id);

        return {
          ...r,
          member_id: user?.member_id ?? '',
          full_name: user?.full_name ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? null,
          role: readMetadataString(user?.role),
          category: readMetadataString(user?.category),
          answer_count: readAnswerCount(r.registration_answers),
        };
      });

      const hasMore = offset + items.length < totalCount;

      return {
        items,
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
