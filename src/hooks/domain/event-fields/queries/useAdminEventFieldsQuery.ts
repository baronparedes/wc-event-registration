import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AdminEventField } from '@/lib/admin/types'

export const adminEventFieldsQueryKey = (eventId: string) =>
  ['admin-event-fields', eventId] as const

/**
 * Fetches all event fields for the given event ID, ordered by display_order.
 * Used in the admin field builder to list and manage registration form fields.
 */
export function useAdminEventFieldsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: eventId ? adminEventFieldsQueryKey(eventId) : ['admin-event-fields', ''],
    queryFn: async (): Promise<AdminEventField[]> => {
      if (!eventId) return []
      const { data, error } = await supabase
        .from('event_fields')
        .select(
          'id, event_id, field_key, label, field_type, is_required, is_active, placeholder, help_text, options, validation_rules, display_order, created_at, updated_at',
        )
        .eq('event_id', eventId)
        .order('display_order', { ascending: true })

      if (error) throw error
      return (data ?? []) as AdminEventField[]
    },
    enabled: Boolean(eventId),
  })
}
