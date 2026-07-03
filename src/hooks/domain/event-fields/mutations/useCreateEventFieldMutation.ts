import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { AdminEventField } from '@/lib/domain/event-fields';
import type { CreateEventFieldInput } from '@/lib/domain/event-fields';
import { supabase } from '@/lib/infrastructure';

import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery';

/**
 * Creates a new event field. Only permitted on draft events.
 * Automatically sets display_order to one beyond the current maximum.
 */
export function useCreateEventFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventFieldInput): Promise<AdminEventField> => {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('status')
        .eq('id', input.event_id)
        .single();

      if (eventError) throw eventError;

      if (event.status !== 'draft') {
        throw new Error(
          'Cannot add fields to a published or archived event. Archive this event and create a new one to change the registration form.',
        );
      }

      const { data: orderData } = await supabase
        .from('event_fields')
        .select('display_order')
        .eq('event_id', input.event_id)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = ((orderData?.[0]?.display_order as number) ?? -1) + 1;

      const { data, error } = await supabase
        .from('event_fields')
        .insert({
          id: crypto.randomUUID(),
          event_id: input.event_id,
          field_key: input.field_key,
          label: input.label,
          field_type: input.field_type,
          is_required: input.is_required,
          is_active: input.is_active,
          placeholder: input.placeholder ?? null,
          help_text: input.help_text ?? null,
          options: input.options ?? [],
          validation_rules: input.validation_rules ?? {},
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AdminEventField;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.event_id) });
    },
  });
}
