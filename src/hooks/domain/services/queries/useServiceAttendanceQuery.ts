import { useInfiniteQuery } from '@tanstack/react-query';

import { PAGINATION_DEFAULTS, QUERY_STALE_TIME_MS } from '@/config/constants';
import type { ServiceAttendance } from '@/lib/domain/services';
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure';

export interface FetchServiceAttendanceFilters {
  start_date?: string;
  end_date?: string;
  time_slot?: string;
  is_walk_in?: boolean;
  is_override?: boolean;
  user_id?: string;
  rfid?: string;
}

export interface ServiceAttendancePage {
  items: ServiceAttendance[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
  totalPages: number;
}

export const serviceAttendanceQueryKey = (filters: FetchServiceAttendanceFilters) =>
  ['service-attendance', filters] as const;

export function useServiceAttendanceQuery(
  filters: FetchServiceAttendanceFilters = {},
  pageSize: number = PAGINATION_DEFAULTS.adminServiceAttendancePageSize,
) {
  return useInfiniteQuery<ServiceAttendancePage, Error>({
    queryKey: [...serviceAttendanceQueryKey(filters), pageSize] as const,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: ServiceAttendancePage) => lastPage.nextCursor,
    queryFn: async ({ pageParam }): Promise<ServiceAttendancePage> => {
      const offset = decodeOffsetCursor(pageParam as string | null);

      let query = supabase
        .from('service_attendance')
        .select(
          `
          *,
          service_seats (
            id,
            table_number,
            seat_number,
            area
          ),
          user:users!service_attendance_user_id_fkey(
            member_id,
            full_name,
            nickname,
            avatar_object_key
          )
        `,
          { count: 'exact' },
        )
        .order('checked_in_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (filters.start_date || filters.end_date) {
        const effectiveStart = filters.start_date ?? filters.end_date!;
        const effectiveEnd = filters.end_date ?? filters.start_date!;
        query = query.gte('service_date', effectiveStart).lte('service_date', effectiveEnd);
      }
      if (filters.time_slot) {
        query = query.eq('time_slot', filters.time_slot);
      }
      if (filters.is_walk_in !== undefined) {
        query = query.eq('is_walk_in', filters.is_walk_in);
      }
      if (filters.is_override !== undefined) {
        query = query.eq('is_override', filters.is_override);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.rfid) {
        query = query.eq('rfid', filters.rfid);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch service attendance: ${error.message}`);
      }

      const totalCount = count ?? 0;
      const items = (data as ServiceAttendance[]) ?? [];
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
