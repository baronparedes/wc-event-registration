import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_KEYS } from '@/config/constants';
import type { UnregisteredMember, UnregisteredMembersReportInput } from '@/lib/domain/attendance';
import { createEdgeFunctionCaller, decodeOffsetCursor, getTotalPages } from '@/lib/infrastructure';

type UnregisteredMembersSuccess = {
  success: true;
  items: UnregisteredMember[];
  total_count: number;
  has_more: boolean;
  next_cursor: string | null;
};

type UnregisteredMembersError = {
  success: false;
  error: string;
  error_code?: string;
  detail?: string;
};

export type AttendanceUnregisteredMembersPage = {
  items: UnregisteredMember[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
};

export interface AttendanceUnregisteredMembersParams {
  pageSize?: number;
  searchTerm?: string;
}

/** Fetches active members without an active registration for an event using infinite query. */
export function useAttendanceUnregisteredMembersQuery(
  eventId: string | undefined,
  params?: AttendanceUnregisteredMembersParams,
) {
  const pageSize = params?.pageSize ?? PAGINATION_DEFAULTS.adminMembersPageSize;
  const searchTerm = params?.searchTerm?.trim() ?? '';

  return useInfiniteQuery<AttendanceUnregisteredMembersPage, Error>({
    queryKey: QUERY_KEYS.adminAttendanceUnregisteredMembers(eventId, pageSize, searchTerm),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: AttendanceUnregisteredMembersPage) => lastPage.nextCursor,
    enabled: Boolean(eventId),
    queryFn: async ({ pageParam }): Promise<AttendanceUnregisteredMembersPage> => {
      if (!eventId) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          totalCount: 0,
          totalPages: 1,
        };
      }

      const offset = decodeOffsetCursor(pageParam as string | null);
      const caller = createEdgeFunctionCaller<
        UnregisteredMembersReportInput,
        UnregisteredMembersSuccess | UnregisteredMembersError
      >('list-unregistered-members');

      const response = await caller({
        event_id: eventId,
        page_size: pageSize,
        offset,
        search_term: searchTerm.length > 0 ? searchTerm : undefined,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load unregistered members report.');
      }

      return {
        items: response.items,
        nextCursor: response.next_cursor,
        hasMore: response.has_more,
        totalCount: response.total_count,
        totalPages: getTotalPages(response.total_count, pageSize),
      };
    },
  });
}
