import type { HandlerResult, SupabaseClient } from '@/shared/handler.ts';

interface ApplyRegistrationRow {
  registration_id: string | null;
  status: 'submitted' | 'updated' | null;
  is_new: boolean;
  should_write_answers: boolean;
  error_code: string | null;
}

export interface InsertResult {
  registrationId: string;
  status: 'submitted' | 'updated';
  isNew: boolean;
  shouldWriteAnswers: boolean;
}

export interface InsertRegistrationParams {
  eventId: string;
  userId: string;
  registrationScopeKey: string;
  idempotencyKey: string;
  hasCompoundScope: boolean;
  duplicatePolicy: string;
}

const errorMessages: Record<string, string> = {
  duplicate_blocked: 'Already registered for this event',
  duplicate_compound_key: 'A registration with the same unique field values already exists.',
};

export async function insertRegistration(
  supabase: SupabaseClient,
  params: InsertRegistrationParams,
): Promise<HandlerResult<InsertResult>> {
  const { data, error } = await supabase.rpc('apply_registration_submission', {
    p_event_id: params.eventId,
    p_user_id: params.userId,
    p_registration_scope_key: params.registrationScopeKey,
    p_idempotency_key: params.idempotencyKey,
    p_has_compound_scope: params.hasCompoundScope,
    p_duplicate_policy: params.duplicatePolicy,
  });

  if (error) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_CREATE_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  const result = (Array.isArray(data) ? data[0] : null) as ApplyRegistrationRow | null;

  if (!result) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_RESOLUTION_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  if (result.error_code) {
    const isExpectedDuplicate =
      result.error_code === 'duplicate_blocked' || result.error_code === 'duplicate_compound_key';

    return {
      ok: false,
      errorCode: result.error_code,
      message: errorMessages[result.error_code] ?? 'Failed to process registration',
      httpStatus: isExpectedDuplicate ? 200 : 500,
    };
  }

  if (!result.registration_id || !result.status) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_RESOLUTION_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  return {
    ok: true,
    data: {
      registrationId: result.registration_id,
      status: result.status,
      isNew: result.is_new,
      shouldWriteAnswers: result.should_write_answers,
    },
  };
}
