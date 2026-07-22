import { useMutation, useQueryClient } from '@tanstack/react-query';

import { writeAdminAuditLogSafely } from '@/lib/domain/admin-audit';
import type { CreateEventInput } from '@/lib/domain/events';
import { mapPublicRegistrationAccessToEventFlags } from '@/lib/domain/events';
import { localDateTimeToUTC8ISO, supabase } from '@/lib/infrastructure';

import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() !== '' ? value : null;
}

/**
 * Creates a new event. Returns the newly created event ID on success.
 * Sets created_by_admin_id from the current session's admin row.
 */
export function useCreateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventInput): Promise<string> => {
      const publicRegistrationFlags = mapPublicRegistrationAccessToEventFlags(
        input.public_registration_access,
      );

      const {
        data: { session },
      } = await supabase.auth.getSession();

      let createdByAdminId: string | null = null;
      if (session) {
        const { data: adminRow } = await supabase
          .from('admins')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();
        createdByAdminId = adminRow?.id ?? null;
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          id: crypto.randomUUID(),
          slug: input.slug,
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
          metadata: {
            allow_name_lookup: input.allow_name_lookup ?? false,
            public_registration_access: input.public_registration_access,
          },
          created_by_admin_id: createdByAdminId,
        })
        .select('id')
        .single();

      if (error) throw error;

      await writeAdminAuditLogSafely({
        action: 'create_event',
        resourceType: 'event',
        resourceId: data.id,
        metadata: {
          slug: input.slug,
          title: input.title,
          status: input.status,
        },
      });

      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
    },
  });
}
