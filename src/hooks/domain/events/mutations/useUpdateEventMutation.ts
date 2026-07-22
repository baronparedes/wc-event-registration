import { useMutation, useQueryClient } from '@tanstack/react-query';

import { writeAdminAuditLogSafely } from '@/lib/domain/admin-audit';
import type { UpdateEventInput } from '@/lib/domain/events';
import { mapPublicRegistrationAccessToEventFlags } from '@/lib/domain/events';
import { localDateTimeToUTC8ISO, supabase } from '@/lib/infrastructure';

import { adminEventQueryKey } from '../queries/useAdminEventQuery';
import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() !== '' ? value : null;
}

/** Updates an existing event by ID. Invalidates the event list and single-event queries. */
export function useUpdateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateEventInput): Promise<void> => {
      const publicRegistrationFlags = mapPublicRegistrationAccessToEventFlags(
        input.public_registration_access,
      );

      const { data: previousEvent } = await supabase
        .from('events')
        .select(
          'title, description, location, starts_at, ends_at, registration_opens_at, registration_closes_at, status, duplicate_policy, registration_mode, allow_public_registrations, require_id_lookup, metadata',
        )
        .eq('id', id)
        .maybeSingle();

      const nextValues: Record<string, unknown> = {
        title: input.title,
        description: emptyToNull(input.description),
        location: emptyToNull(input.location),
        starts_at: localDateTimeToUTC8ISO(input.starts_at),
        ends_at: localDateTimeToUTC8ISO(input.ends_at),
        registration_opens_at: localDateTimeToUTC8ISO(input.registration_opens_at),
        registration_closes_at: localDateTimeToUTC8ISO(input.registration_closes_at),
        status: input.status,
        duplicate_policy: input.duplicate_policy,
        registration_mode: input.registration_mode,
        allow_public_registrations: publicRegistrationFlags.allow_public_registrations,
        require_id_lookup: publicRegistrationFlags.require_id_lookup,
      };

      const previousMetadata = (previousEvent?.metadata as Record<string, unknown> | null) ?? {};
      nextValues.metadata = {
        ...previousMetadata,
        public_registration_access: input.public_registration_access,
      };

      // Handle metadata updates
      if (input.allow_name_lookup !== undefined) {
        nextValues.metadata = {
          ...(nextValues.metadata as Record<string, unknown>),
          allow_name_lookup: input.allow_name_lookup,
        };
      }

      const { error } = await supabase.from('events').update(nextValues).eq('id', id);

      if (error) throw error;

      const changedFields = Object.entries(nextValues).reduce<string[]>((acc, [key, value]) => {
        if ((previousEvent as Record<string, unknown> | null)?.[key] !== value) {
          acc.push(key);
        }
        return acc;
      }, []);

      await writeAdminAuditLogSafely({
        action: 'update_event',
        resourceType: 'event',
        resourceId: id,
        metadata: {
          changed_fields: changedFields,
        },
      });
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey(id) });
      // Invalidate all public event queries so registration pages see updated metadata (e.g. allow_name_lookup)
      queryClient.invalidateQueries({ queryKey: ['public-event-by-slug'] });
    },
  });
}
