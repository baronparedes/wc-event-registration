import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/infrastructure'
import { writeAdminAuditLogSafely } from '@/lib/domain/admin-audit'
import type { UpdateEventInput } from '@/lib/domain/events'
import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery'
import { adminEventQueryKey } from '../queries/useAdminEventQuery'

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() !== '' ? value : null
}

/** Updates an existing event by ID. Invalidates the event list and single-event queries. */
export function useUpdateEventMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateEventInput): Promise<void> => {
      const { data: previousEvent } = await supabase
        .from('events')
        .select(
          'title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, status, duplicate_policy, registration_mode, metadata',
        )
        .eq('id', id)
        .maybeSingle()

      const nextValues: Record<string, unknown> = {
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
      }

      // Handle metadata updates
      if (input.allow_name_lookup !== undefined) {
        const previousMetadata = (previousEvent?.metadata as Record<string, unknown> | null) ?? {}
        nextValues.metadata = {
          ...previousMetadata,
          allow_name_lookup: input.allow_name_lookup,
        }
      }

      const { error } = await supabase.from('events').update(nextValues).eq('id', id)

      if (error) throw error

      const changedFields = Object.entries(nextValues).reduce<string[]>((acc, [key, value]) => {
        if ((previousEvent as Record<string, unknown> | null)?.[key] !== value) {
          acc.push(key)
        }
        return acc
      }, [])

      await writeAdminAuditLogSafely({
        action: 'update_event',
        resourceType: 'event',
        resourceId: id,
        metadata: {
          changed_fields: changedFields,
        },
      })
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey(id) })
    },
  })
}
