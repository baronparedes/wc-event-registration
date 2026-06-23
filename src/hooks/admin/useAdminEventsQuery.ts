import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { AdminEvent } from '../../lib/admin/types'

export const ADMIN_EVENTS_QUERY_KEY = ['admin-events'] as const

/** Fetches all events ordered by created_at descending for admin management. */
export function useAdminEventsQuery() {
  return useQuery({
    queryKey: ADMIN_EVENTS_QUERY_KEY,
    queryFn: async (): Promise<AdminEvent[]> => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as AdminEvent[]
    },
  })
}
