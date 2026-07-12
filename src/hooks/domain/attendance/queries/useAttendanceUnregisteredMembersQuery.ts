import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
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
  pageSize: number;
  cursor: string | null;
  searchTerm?: string;
}

/** Fetches active members without an active registration for an event. */
export function useAttendanceUnregisteredMembersQuery(
  eventId: string | undefined,
  params: AttendanceUnregisteredMembersParams,
) {
  const searchTerm = params.searchTerm?.trim() ?? '';
  const offset = decodeOffsetCursor(params.cursor);

  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceUnregisteredMembers(
      eventId,
      params.pageSize,
      params.cursor,
      searchTerm,
    ),
    placeholderData: keepPreviousData,
    enabled: Boolean(eventId),
    queryFn: async (): Promise<AttendanceUnregisteredMembersPage> => {
      if (!eventId) {
        return {
          items: [],
          nextCursor: null,
          hasMore: false,
          totalCount: 0,
          totalPages: 1,
        };
      }

      const caller = createEdgeFunctionCaller<
        UnregisteredMembersReportInput,
        UnregisteredMembersSuccess | UnregisteredMembersError
      >('list-unregistered-members');

      const response = await caller({
        event_id: eventId,
        page_size: params.pageSize,
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
        totalPages: getTotalPages(response.total_count, params.pageSize),
      };
    },
  });
}
