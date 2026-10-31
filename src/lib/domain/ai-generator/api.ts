import { mapPublicRegistrationAccessToEventFlags } from '@/lib/domain/events';
import { createEdgeFunctionCaller, supabase } from '@/lib/infrastructure';

import type {
  BlueprintDynamicField,
  CreateEventWithBlueprintInput,
  CreateFormWithBlueprintInput,
  GenerateEntityBlueprintPayload,
  GenerateEntityBlueprintResponse,
} from './types';

const callGenerateEntityBlueprint = createEdgeFunctionCaller<
  GenerateEntityBlueprintPayload,
  GenerateEntityBlueprintResponse
>('generate-entity-blueprint');

export async function generateEntityBlueprint(
  payload: GenerateEntityBlueprintPayload,
): Promise<GenerateEntityBlueprintResponse> {
  const result = await callGenerateEntityBlueprint(payload);
  if (!result || !result.metadata || !Array.isArray(result.fields)) {
    throw new Error('Invalid blueprint response from AI generation service');
  }
  return result;
}

export async function fetchCurrentAdminId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminRow } = await supabase
    .from('admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  return (adminRow?.id as string | undefined) ?? null;
}

export async function createEventWithBlueprint(
  input: CreateEventWithBlueprintInput,
): Promise<{ id: string; slug: string }> {
  const adminId = await fetchCurrentAdminId();
  const eventId = crypto.randomUUID();
  const { metadata, fields, startsAt, endsAt } = input;

  const flags = mapPublicRegistrationAccessToEventFlags(metadata.audience);

  const eventPayload = {
    id: eventId,
    title: metadata.title,
    slug: metadata.slug,
    description: metadata.description,
    location: metadata.location ?? 'CCF Center',
    starts_at: startsAt ?? metadata.starts_at ?? null,
    ends_at: endsAt ?? metadata.ends_at ?? null,
    registration_opens_at: metadata.registration_opens_at ?? null,
    registration_closes_at: metadata.registration_closes_at ?? null,
    status: 'draft' as const,
    duplicate_policy: metadata.duplicate_policy,
    registration_mode: metadata.registration_mode ?? 'open',
    allow_public_registrations: flags.allow_public_registrations,
    require_id_lookup: flags.require_id_lookup,
    cover_image_key: null,
    metadata: {
      send_email_after_completion: false,
    },
    created_by_admin_id: adminId,
  };

  const { error: eventError } = await supabase.from('events').insert(eventPayload);
  if (eventError) throw eventError;

  if (fields.length > 0) {
    const fieldsToInsert = fields.map((f, index) => ({
      id: crypto.randomUUID(),
      event_id: eventId,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      applicability: 'both' as const,
      is_required: f.is_required,
      is_active: true,
      placeholder: f.placeholder ?? null,
      help_text: f.help_text ?? null,
      options: f.options ?? [],
      validation_rules: f.validation_rules ?? {},
      display_order: index,
    }));

    const { error: fieldsError } = await supabase.from('event_fields').insert(fieldsToInsert);
    if (fieldsError) throw fieldsError;
  }

  return { id: eventId, slug: metadata.slug };
}

export async function createFormWithBlueprint(
  input: CreateFormWithBlueprintInput,
): Promise<{ id: string; slug: string }> {
  const adminId = await fetchCurrentAdminId();
  const formId = crypto.randomUUID();
  const { metadata, fields } = input;

  const formPayload = {
    id: formId,
    title: metadata.title,
    slug: metadata.slug,
    description: metadata.description,
    status: 'draft' as const,
    duplicate_policy: metadata.duplicate_policy,
    audience: metadata.audience,
    metadata: {
      send_email_after_completion: false,
    },
    created_by_admin_id: adminId,
  };

  const { error: formError } = await supabase.from('forms').insert(formPayload);
  if (formError) throw formError;

  if (fields.length > 0) {
    const fieldsToInsert = fields.map((f, index) => ({
      id: crypto.randomUUID(),
      form_id: formId,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      field_applicability: 'all' as const,
      is_required: f.is_required,
      is_active: true,
      placeholder: f.placeholder ?? null,
      help_text: f.help_text ?? null,
      options: f.options ?? [],
      validation_rules: f.validation_rules ?? {},
      display_order: index,
    }));

    const { error: fieldsError } = await supabase.from('form_fields').insert(fieldsToInsert);
    if (fieldsError) throw fieldsError;
  }

  return { id: formId, slug: metadata.slug };
}

export async function appendEventFieldsFromBlueprint(
  eventId: string,
  fields: BlueprintDynamicField[],
): Promise<void> {
  if (fields.length === 0) return;

  const { data: orderData } = await supabase
    .from('event_fields')
    .select('display_order')
    .eq('event_id', eventId)
    .order('display_order', { ascending: false })
    .limit(1);

  const startOrder = ((orderData?.[0]?.display_order as number) ?? -1) + 1;

  const fieldsToInsert = fields.map((f, index) => ({
    id: crypto.randomUUID(),
    event_id: eventId,
    field_key: f.field_key,
    label: f.label,
    field_type: f.field_type,
    applicability: 'both' as const,
    is_required: f.is_required,
    is_active: true,
    placeholder: f.placeholder ?? null,
    help_text: f.help_text ?? null,
    options: f.options ?? [],
    validation_rules: f.validation_rules ?? {},
    display_order: startOrder + index,
  }));

  const { error } = await supabase.from('event_fields').insert(fieldsToInsert);
  if (error) throw error;
}

export async function appendFormFieldsFromBlueprint(
  formId: string,
  fields: BlueprintDynamicField[],
): Promise<void> {
  if (fields.length === 0) return;

  const { data: orderData } = await supabase
    .from('form_fields')
    .select('display_order')
    .eq('form_id', formId)
    .order('display_order', { ascending: false })
    .limit(1);

  const startOrder = ((orderData?.[0]?.display_order as number) ?? -1) + 1;

  const fieldsToInsert = fields.map((f, index) => ({
    id: crypto.randomUUID(),
    form_id: formId,
    field_key: f.field_key,
    label: f.label,
    field_type: f.field_type,
    field_applicability: 'all' as const,
    is_required: f.is_required,
    is_active: true,
    placeholder: f.placeholder ?? null,
    help_text: f.help_text ?? null,
    options: f.options ?? [],
    validation_rules: f.validation_rules ?? {},
    display_order: startOrder + index,
  }));

  const { error } = await supabase.from('form_fields').insert(fieldsToInsert);
  if (error) throw error;
}
