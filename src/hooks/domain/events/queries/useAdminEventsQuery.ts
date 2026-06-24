import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AdminEvent } from '@/lib/admin/types'

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
}

function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0

  const parsed = Number.parseInt(cursor, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

/** Fetches all events ordered by created_at descending for admin management. */
export function useAdminEventsQuery(params?: AdminEventsPageParams) {
  const pageSize = params?.pageSize ?? DEFAULT_PAGE_SIZE
  const cursor = params?.cursor ?? null
  const offset = decodeOffsetCursor(cursor)

  return useQuery({
    queryKey: [...ADMIN_EVENTS_QUERY_KEY, pageSize, cursor] as const,
    queryFn: async (): Promise<AdminEventsPage> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (error) throw error

      const items = (data ?? []) as AdminEvent[]
      const hasMore = items.length === pageSize

      return {
        items,
        hasMore,
        nextCursor: hasMore ? String(offset + pageSize) : null,
      }
    },
  })
}
