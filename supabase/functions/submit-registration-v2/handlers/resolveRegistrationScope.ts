import type { HandlerResult } from '@/shared/handler.ts';
import { resolveCompoundScopeKey, selectUniquenessComponentFields } from '@/shared/uniqueness.ts';
import type { EventFieldWithValidation } from '@/shared/validation.ts';

export interface RegistrationScope {
  registrationScopeKey: string;
  hasCompoundScope: boolean;
}

function resolveRegistrationScopeKey(duplicatePolicy: string, idempotencyKey: string): string {
  return duplicatePolicy === 'allow_multiple' || duplicatePolicy === 'allow_multiple_update'
    ? idempotencyKey
    : 'primary';
}

export function resolveRegistrationScope(
  fields: EventFieldWithValidation[],
  responses: Record<string, unknown>,
  duplicatePolicy: string,
  idempotencyKey: string,
): HandlerResult<RegistrationScope> {
  const uniquenessFields = selectUniquenessComponentFields(fields);
  const compoundScopeResult = resolveCompoundScopeKey(responses, uniquenessFields);

  if (compoundScopeResult.errors.length > 0) {
    return {
      ok: false,
      errorCode: 'VALIDATION_FAILED',
      message: 'Validation failed',
      httpStatus: 200,
      errors: compoundScopeResult.errors,
    };
  }

  const hasCompoundScope = Boolean(compoundScopeResult.scopeKey);
  const registrationScopeKey =
    compoundScopeResult.scopeKey ?? resolveRegistrationScopeKey(duplicatePolicy, idempotencyKey);

  return { ok: true, data: { registrationScopeKey, hasCompoundScope } };
}
