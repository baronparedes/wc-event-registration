import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ADMIN_EVENTS_QUERY_KEY } from './useAdminEventsQuery'

/** Publishes an event by setting its status to 'published'. */
export function usePublishEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('events').update({ status: 'published' }).eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })
    },
  })
}
