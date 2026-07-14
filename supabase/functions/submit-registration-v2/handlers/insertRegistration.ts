import { POSTGRES_ERROR_CODES } from '@/shared/constants.ts';
import type { HandlerResult, SupabaseClient } from '@/shared/handler.ts';

const REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT = 'registrations_event_user_unique_idx';
const REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT =
  'registrations_event_idempotency_unique_idx';

interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
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

function isUniqueConstraintError(error: PostgrestErrorLike | null, constraint: string): boolean {
  if (!error || error.code !== POSTGRES_ERROR_CODES.uniqueViolation) {
    return false;
  }
  const combined = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  return combined.includes(constraint);
}

function isRegistrationUniqueConflict(error: PostgrestErrorLike | null): boolean {
  return (
    isUniqueConstraintError(error, REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT) ||
    isUniqueConstraintError(error, REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT)
  );
}

async function updateRegistrationToUpdated(
  supabase: SupabaseClient,
  registrationId: string,
): Promise<HandlerResult<void>> {
  const { error } = await supabase
    .from('registrations')
    .update({ status: 'updated', submitted_at: new Date().toISOString() })
    .eq('id', registrationId);

  if (error) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_UPDATE_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  return { ok: true, data: undefined };
}

export async function insertRegistration(
  supabase: SupabaseClient,
  params: InsertRegistrationParams,
): Promise<HandlerResult<InsertResult>> {
  const {
    eventId,
    userId,
    registrationScopeKey,
    idempotencyKey,
    hasCompoundScope,
    duplicatePolicy,
  } = params;

  const { data: newReg, error: createError } = await supabase
    .from('registrations')
    .insert({
      event_id: eventId,
      user_id: userId,
      registration_scope_key: registrationScopeKey,
      idempotency_key: idempotencyKey,
      status: 'submitted',
      source: 'public',
    })
    .select('id')
    .single();

  if (!createError && newReg) {
    return {
      ok: true,
      data: {
        registrationId: newReg.id,
        status: 'submitted',
        isNew: true,
        shouldWriteAnswers: true,
      },
    };
  }

  if (!isRegistrationUniqueConflict(createError as PostgrestErrorLike)) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_CREATE_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  // Unique conflict — begin phased recovery
  let registrationId: string | null = null;
  let status: 'submitted' | 'updated' = 'submitted';
  let shouldWriteAnswers = true;

  // Phase 1: Idempotency key recovery
  const isIdempotencyConflict = isUniqueConstraintError(
    createError as PostgrestErrorLike,
    REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT,
  );

  if (isIdempotencyConflict) {
    const { data: existingByIdempotency, error: idempotencyLookupError } = await supabase
      .from('registrations')
      .select('id, user_id, status')
      .eq('event_id', eventId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (idempotencyLookupError) {
      return {
        ok: false,
        errorCode: 'REGISTRATION_IDEMPOTENCY_RECOVERY_FAILED',
        message: 'Failed to process registration',
        httpStatus: 500,
      };
    }

    if (existingByIdempotency?.id && existingByIdempotency.user_id === userId) {
      registrationId = existingByIdempotency.id;
      status = existingByIdempotency.status === 'updated' ? 'updated' : 'submitted';
      shouldWriteAnswers = false;
    }
  }

  // Phase 2: Compound scope recovery
  if (!registrationId && hasCompoundScope) {
    if (duplicatePolicy === 'allow_multiple_update') {
      const { data: existingByScope, error: scopeLookupError } = await supabase
        .from('registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('registration_scope_key', registrationScopeKey)
        .maybeSingle();

      if (scopeLookupError) {
        return {
          ok: false,
          errorCode: 'REGISTRATION_CHECK_FAILED',
          message: 'Failed to process registration',
          httpStatus: 500,
        };
      }

      if (!existingByScope) {
        return {
          ok: false,
          errorCode: 'duplicate_compound_key',
          message: 'A registration with the same unique field values already exists.',
          httpStatus: 200,
        };
      }

      registrationId = existingByScope.id;
      status = 'updated';

      const updateResult = await updateRegistrationToUpdated(supabase, registrationId);
      if (!updateResult.ok) return updateResult;
    } else {
      return {
        ok: false,
        errorCode: 'duplicate_compound_key',
        message: 'A registration with the same unique field values already exists.',
        httpStatus: 200,
      };
    }
  }

  // Phase 3: Policy-based scope recovery (non-compound scope)
  if (!registrationId) {
    if (duplicatePolicy === 'allow_multiple') {
      return {
        ok: false,
        errorCode: 'REGISTRATION_CONFLICT_RECOVERY_FAILED',
        message: 'Failed to process registration',
        httpStatus: 500,
      };
    }

    if (duplicatePolicy === 'allow_multiple_update') {
      const { data: existingByScopeForUpdate, error: scopeRecoveryError } = await supabase
        .from('registrations')
        .select('id, status')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('registration_scope_key', registrationScopeKey)
        .maybeSingle();

      if (scopeRecoveryError) {
        return {
          ok: false,
          errorCode: 'REGISTRATION_CHECK_FAILED',
          message: 'Failed to process registration',
          httpStatus: 500,
        };
      }

      if (existingByScopeForUpdate?.id) {
        registrationId = existingByScopeForUpdate.id;
        status = 'updated';

        const updateResult = await updateRegistrationToUpdated(supabase, registrationId);
        if (!updateResult.ok) return updateResult;
      } else {
        return {
          ok: false,
          errorCode: 'duplicate_compound_key',
          message: 'A registration with the same unique field values already exists.',
          httpStatus: 200,
        };
      }
    }
  }

  // Phase 4: Fallback primary scope recovery
  if (!registrationId) {
    const { data: existingReg, error: regCheckError } = await supabase
      .from('registrations')
      .select('id, status')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .eq('registration_scope_key', 'primary')
      .maybeSingle();

    if (regCheckError) {
      return {
        ok: false,
        errorCode: 'REGISTRATION_CHECK_FAILED',
        message: 'Failed to process registration',
        httpStatus: 500,
      };
    }

    if (!existingReg) {
      if (duplicatePolicy === 'allow_multiple_update') {
        return {
          ok: false,
          errorCode: 'duplicate_compound_key',
          message: 'A registration with the same unique field values already exists.',
          httpStatus: 200,
        };
      }
      return {
        ok: false,
        errorCode: 'REGISTRATION_CONFLICT_RECOVERY_FAILED',
        message: 'Failed to process registration',
        httpStatus: 500,
      };
    }

    if (duplicatePolicy === 'block') {
      return {
        ok: false,
        errorCode: 'duplicate_blocked',
        message: 'Already registered for this event',
        httpStatus: 200,
      };
    }

    registrationId = existingReg.id;
    status = 'updated';

    const updateResult = await updateRegistrationToUpdated(supabase, registrationId);
    if (!updateResult.ok) return updateResult;
  }

  if (!registrationId) {
    return {
      ok: false,
      errorCode: 'REGISTRATION_RESOLUTION_FAILED',
      message: 'Failed to process registration',
      httpStatus: 500,
    };
  }

  return { ok: true, data: { registrationId, status, isNew: false, shouldWriteAnswers } };
}
