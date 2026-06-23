import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery'

type DeleteEventFieldInput = {
  fieldId: string
  eventId: string
}

/**
 * Deletes an event field. Only permitted on draft events.
 */
export function useDeleteEventFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fieldId, eventId }: DeleteEventFieldInput): Promise<void> => {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('status')
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError

      if (event.status !== 'draft') {
        throw new Error(
          'Cannot delete fields from a published or archived event. Archive this event and create a new one to change the registration form.',
        )
      }

      const { error } = await supabase.from('event_fields').delete().eq('id', fieldId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.eventId) })
    },
  })
}
