import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import { publishEventSchema } from '../../../../lib/admin/eventSchema'
import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery'

export interface PublishValidationError {
  type: 'validation_error'
  missingFields: string[]
}

/** Publishes an event by setting its status to 'published'. */
export function usePublishEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Fetch the full event to validate
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (!event) throw new Error('Event not found')

      // Validate against publish schema
      const validationResult = publishEventSchema.safeParse({
        ...event,
        starts_at: event.starts_at?.slice(0, 16) || '',
        ends_at: event.ends_at?.slice(0, 16) || '',
        registration_opens_at: event.registration_opens_at?.slice(0, 16) || '',
        registration_closes_at: event.registration_closes_at?.slice(0, 16) || '',
      })

      if (!validationResult.success) {
        // Extract missing field labels for user-friendly error
        const missingFields = validationResult.error.issues.map((issue) => {
          const fieldName = issue.path[0] as string
          const fieldLabels: Record<string, string> = {
            description: 'Description',
            location: 'Location',
            starts_at: 'Event Start Date & Time',
            ends_at: 'Event End Date & Time',
            registration_opens_at: 'Registration Opens',
            registration_closes_at: 'Registration Closes',
          }
          return fieldLabels[fieldName] || fieldName
        })

        const error = new Error(`Cannot publish: ${missingFields.join(', ')} required`) as Error & {
          missingFields?: string[]
        }
        error.missingFields = missingFields
        throw error
      }

      // Publish if validation passes
      const { error } = await supabase.from('events').update({ status: 'published' }).eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })
    },
  })
}
