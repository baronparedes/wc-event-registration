import type { HandlerResult, SupabaseClient } from '@/shared/handler.ts';
import type { EventFieldWithValidation } from '@/shared/validation.ts';
import { normalizePrimaryRoleValue } from '@/shared/validation.ts';

interface EventRow {
  id: string;
  duplicate_policy: string;
}

interface UserRow {
  id: string;
  role: string;
}

interface EventFieldRow {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: unknown;
  validation_rules: unknown;
}

export interface EventContext {
  event: EventRow;
  user: UserRow;
  fields: EventFieldWithValidation[];
  primaryRole: string | null;
}

export async function resolveEventContext(
  supabase: SupabaseClient,
  eventSlug: string,
  memberId: string,
): Promise<HandlerResult<EventContext>> {
  const [eventResult, userResult] = await Promise.all([
    supabase.from('events').select('id, duplicate_policy').eq('slug', eventSlug).maybeSingle(),
    supabase.from('users').select('id, role').eq('member_id', memberId).maybeSingle<UserRow>(),
  ]);

  if (eventResult.error) {
    return {
      ok: false,
      errorCode: 'EVENT_LOOKUP_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  if (!eventResult.data) {
    return { ok: false, errorCode: 'EVENT_NOT_FOUND', message: 'Event not found', httpStatus: 200 };
  }

  if (userResult.error) {
    return {
      ok: false,
      errorCode: 'USER_LOOKUP_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  if (!userResult.data) {
    return {
      ok: false,
      errorCode: 'MEMBER_NOT_FOUND',
      message: 'Member not found',
      httpStatus: 200,
    };
  }

  const { data: eventFieldsData, error: fieldsError } = await supabase
    .from('event_fields')
    .select('id, field_key, label, field_type, is_required, options, validation_rules')
    .eq('event_id', eventResult.data.id)
    .eq('is_active', true);

  if (fieldsError) {
    return {
      ok: false,
      errorCode: 'FIELDS_LOOKUP_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  const fields: EventFieldWithValidation[] = (eventFieldsData ?? []).map(
    (field: EventFieldRow) => ({
      id: field.id,
      field_key: field.field_key,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required,
      options: Array.isArray(field.options) ? field.options : [],
      validation_rules: (field.validation_rules ?? {}) as Record<string, unknown>,
    }),
  );

  return {
    ok: true,
    data: {
      event: eventResult.data as EventRow,
      user: userResult.data,
      fields,
      primaryRole: normalizePrimaryRoleValue(userResult.data.role),
    },
  };
}
