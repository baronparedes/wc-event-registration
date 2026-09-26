import { supabase } from '@/lib/infrastructure';

import type {
  CreateEventFieldInput,
  ReorderEventFieldsInput,
  UpdateEventFieldInput,
} from './schemas';
import type { AdminEventField } from './types';

export async function fetchAdminEventFields(eventId: string): Promise<AdminEventField[]> {
  const { data, error } = await supabase
    .from('event_fields')
    .select(
      'id, event_id, field_key, label, field_type, applicability, is_required, is_active, placeholder, help_text, options, validation_rules, display_order, created_at, updated_at',
    )
    .eq('event_id', eventId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AdminEventField[];
}

export async function fetchEventFieldEventStatus(eventId: string): Promise<string> {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('status')
    .eq('id', eventId)
    .single();

  if (eventError) throw eventError;
  return event.status as string;
}

export async function createEventField(input: CreateEventFieldInput): Promise<AdminEventField> {
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
      applicability: input.applicability,
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
}

export async function updateEventField(
  id: string,
  updates: Omit<UpdateEventFieldInput, 'id'>,
): Promise<AdminEventField> {
  const { data, error } = await supabase
    .from('event_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as AdminEventField;
}

export async function deleteEventField(fieldId: string): Promise<void> {
  const { error } = await supabase.from('event_fields').delete().eq('id', fieldId);

  if (error) throw error;
}

export async function reorderEventFields(input: ReorderEventFieldsInput): Promise<void> {
  const { error } = await supabase.rpc('reorder_event_fields', {
    p_event_id: input.event_id,
    p_ordered_ids: input.orderedIds,
  });

  if (error) throw error;
}
