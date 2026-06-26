import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { decodeOffsetCursor, getTotalPages, supabase } from '@/lib/infrastructure'
import type { AdminEvent } from '@/lib/domain/events'

export const ADMIN_EVENTS_QUERY_KEY = ['admin-events'] as const

const DEFAULT_PAGE_SIZE = 20

export interface AdminEventsPageParams {
  pageSize?: number
  cursor?: string | null
}

export interface AdminEventsPage {
  items: AdminEvent[]
  nextCursor: string | null
  hasMore: boolean
  totalCount: number
  totalPages: number
}

/** Fetches all events ordered by created_at descending for admin management. */
export function useAdminEventsQuery(params?: AdminEventsPageParams) {
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE
  const cursor = params?.cursor ?? null
  const offset = decodeOffsetCursor(cursor)

  return useQuery({
    queryKey: [...ADMIN_EVENTS_QUERY_KEY, pageSize, cursor] as const,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<AdminEventsPage> => {
      const { data, error, count } = await supabase
        .from('events')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) throw error

      const items = (data ?? []) as AdminEvent[]
      const totalCount = count ?? 0
      const hasMore = offset + items.length < totalCount

      return {
        items,
        hasMore,
        nextCursor: hasMore ? String(offset + pageSize) : null,
        totalCount,
        totalPages: getTotalPages(totalCount, pageSize),
      }
    },
  })
}
