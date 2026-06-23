import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import type { AdminEventField } from '../../../../lib/admin/types'
import type { UpdateEventFieldInput } from '../../../../lib/admin/eventFieldSchema'
import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery'

/**
 * Updates an existing event field.
 * On draft events: all properties can be changed.
 * On published events: only label, placeholder, and help_text can be changed.
 * On archived events: no changes are permitted.
 */
export function useUpdateEventFieldMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateEventFieldInput): Promise<AdminEventField> => {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('status')
        .eq('id', input.event_id)
        .single()

      if (eventError) throw eventError

      if (event.status === 'archived') {
        throw new Error('Cannot edit fields on archived events.')
      }

      const { id, ...updates } = input

      if (event.status === 'published') {
        const lockedKeys = Object.keys(updates).filter(
          (k) => k !== 'label' && k !== 'placeholder' && k !== 'help_text',
        )
        if (lockedKeys.length > 0) {
          throw new Error(
            'Published events can only have field labels and help text edited. To change field types or validation rules, archive this event and create a new one.',
          )
        }
      }

      const { data, error } = await supabase
        .from('event_fields')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as AdminEventField
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.event_id) })
    },
  })
}
