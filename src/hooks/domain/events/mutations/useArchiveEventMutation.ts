import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery'

/** Archives an event (soft-delete) by setting its status to 'archived'. */
export function useArchiveEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('events').update({ status: 'archived' }).eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })
    },
  })
}
