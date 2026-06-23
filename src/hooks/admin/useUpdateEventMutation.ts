import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { UpdateEventInput } from '../../lib/admin/eventSchema'
import { ADMIN_EVENTS_QUERY_KEY } from './useAdminEventsQuery'
import { adminEventQueryKey } from './useAdminEventQuery'

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() !== '' ? value : null
}

/** Updates an existing event by ID. Invalidates the event list and single-event queries. */
export function useUpdateEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateEventInput): Promise<void> => {
      const { error } = await supabase
        .from('events')
        .update({
          title: input.title,
          description: emptyToNull(input.description),
          location: emptyToNull(input.location),
          starts_at: emptyToNull(input.starts_at),
          ends_at: emptyToNull(input.ends_at),
          registration_opens_at: emptyToNull(input.registration_opens_at),
          registration_closes_at: emptyToNull(input.registration_closes_at),
          status: input.status,
          duplicate_policy: input.duplicate_policy,
          registration_mode: input.registration_mode,
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey(id) })
    },
  })
}
