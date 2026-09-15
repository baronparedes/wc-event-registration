import type { HandlerResult, SupabaseClient } from '@/shared/handler.ts';
import { isRegistrationOpenNow } from '@/shared/registrationAvailability.ts';
import type { EventFieldWithValidation } from '@/shared/validation.ts';
import { normalizePrimaryRoleValue } from '@/shared/validation.ts';

interface EventRow {
  id: string;
  duplicate_policy: string;
  registration_mode: 'open' | 'closed';
  registration_opens_at: string | null;
  registration_closes_at: string | null;
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
  applicability: 'members' | 'guests' | 'both';
  is_required: boolean;
  options: unknown;
  validation_rules: unknown;
}

interface RegistrationContextRow {
  event_id: string | null;
  duplicate_policy: string | null;
  registration_mode: 'open' | 'closed' | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  user_id: string | null;
  user_role: string | null;
  fields: unknown;
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
  const { data: contextData, error: contextError } = await supabase.rpc(
    'get_registration_submission_context',
    { p_event_slug: eventSlug, p_member_id: memberId },
  );

  if (contextError) {
    return {
      ok: false,
      errorCode: 'EVENT_LOOKUP_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  const context = (
    Array.isArray(contextData) ? contextData[0] : null
  ) as RegistrationContextRow | null;

  if (!context?.event_id) {
    return { ok: false, errorCode: 'EVENT_NOT_FOUND', message: 'Event not found', httpStatus: 200 };
  }

  const event: EventRow = {
    id: context.event_id,
    duplicate_policy: context.duplicate_policy ?? 'block',
    registration_mode: context.registration_mode ?? 'closed',
    registration_opens_at: context.registration_opens_at,
    registration_closes_at: context.registration_closes_at,
  };

  if (!isRegistrationOpenNow(event)) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_CLOSED',
      message: 'Registration is currently closed for this event',
      httpStatus: 200,
    };
  }

  if (!context.user_id) {
    return {
      ok: false,
      errorCode: 'MEMBER_NOT_FOUND',
      message: 'Member not found',
      httpStatus: 200,
    };
  }

  const user: UserRow = {
    id: context.user_id,
    role: context.user_role ?? '',
  };
  const eventFieldsData = Array.isArray(context.fields) ? (context.fields as EventFieldRow[]) : [];
  const fields: EventFieldWithValidation[] = eventFieldsData.map((field: EventFieldRow) => ({
    id: field.id,
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type,
    is_required: field.is_required,
    options: Array.isArray(field.options) ? field.options : [],
    validation_rules: (field.validation_rules ?? {}) as Record<string, unknown>,
  }));

  return {
    ok: true,
    data: {
      event,
      user,
      fields,
      primaryRole: normalizePrimaryRoleValue(user.role),
    },
  };
}
