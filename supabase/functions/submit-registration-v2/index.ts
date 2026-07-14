import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';

import { checkDuplicatePolicy } from './handlers/checkDuplicatePolicy.ts';
import { insertRegistration } from './handlers/insertRegistration.ts';
import { parseRequest } from './handlers/parseRequest.ts';
import { persistAnswers } from './handlers/persistAnswers.ts';
import { resolveEventContext } from './handlers/resolveEventContext.ts';
import { resolveRegistrationScope } from './handlers/resolveRegistrationScope.ts';
import { validateFields } from './handlers/validateFields.ts';
import { validateSlotCapacity } from './handlers/validateSlotCapacity.ts';

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'submit-registration-v2',
    method: 'POST',
    publicRateLimit: {
      scope: 'submit-registration',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  const { corsHeaders } = guard;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    // Step 1: Parse and validate request body
    const parseResult = await parseRequest(req);
    if (!parseResult.ok)
      return errorResponse(corsHeaders, parseResult.httpStatus, parseResult.message, undefined, {
        error_code: parseResult.errorCode,
        ...(parseResult.errors ? { errors: parseResult.errors } : {}),
      });
    const { event_slug, member_id, responses, idempotency_key } = parseResult.data;

    const supabase = guard.client;

    // Step 2: Resolve event, user, and field context
    const contextResult = await resolveEventContext(supabase, event_slug, member_id);
    if (!contextResult.ok)
      return errorResponse(
        corsHeaders,
        contextResult.httpStatus,
        contextResult.message,
        undefined,
        {
          error_code: contextResult.errorCode,
        },
      );
    const { event, user, fields, primaryRole } = contextResult.data;

    // Step 3: Compute registration scope key (pure)
    const scopeResult = resolveRegistrationScope(
      fields,
      responses,
      event.duplicate_policy,
      idempotency_key,
    );
    if (!scopeResult.ok)
      return errorResponse(corsHeaders, scopeResult.httpStatus, scopeResult.message, undefined, {
        error_code: scopeResult.errorCode,
        ...(scopeResult.errors ? { errors: scopeResult.errors } : {}),
      });
    const { registrationScopeKey, hasCompoundScope } = scopeResult.data;

    // Step 4: Block-policy duplicate pre-check
    const duplicateCheckResult = await checkDuplicatePolicy(
      supabase,
      event.duplicate_policy,
      event.id,
      user.id,
    );
    if (!duplicateCheckResult.ok)
      return errorResponse(
        corsHeaders,
        duplicateCheckResult.httpStatus,
        duplicateCheckResult.message,
        undefined,
        {
          error_code: duplicateCheckResult.errorCode,
        },
      );

    // Step 5: Optimistic insert with full conflict recovery
    const insertResult = await insertRegistration(supabase, {
      eventId: event.id,
      userId: user.id,
      registrationScopeKey,
      idempotencyKey: idempotency_key,
      hasCompoundScope,
      duplicatePolicy: event.duplicate_policy,
    });
    if (!insertResult.ok)
      return errorResponse(corsHeaders, insertResult.httpStatus, insertResult.message, undefined, {
        error_code: insertResult.errorCode,
      });
    const { registrationId, status, isNew, shouldWriteAnswers } = insertResult.data;

    // Steps 6–8: Answer pipeline (skipped for idempotent replays)
    if (shouldWriteAnswers) {
      const fieldValidationResult = validateFields(fields, responses);
      if (!fieldValidationResult.ok)
        return errorResponse(
          corsHeaders,
          fieldValidationResult.httpStatus,
          fieldValidationResult.message,
          undefined,
          {
            error_code: fieldValidationResult.errorCode,
            errors: fieldValidationResult.errors,
          },
        );

      const slotResult = await validateSlotCapacity(supabase, {
        fields,
        responses,
        registrationId,
        isNew,
        memberRole: primaryRole,
      });
      if (!slotResult.ok)
        return errorResponse(corsHeaders, slotResult.httpStatus, slotResult.message, undefined, {
          error_code: slotResult.errorCode,
          errors: slotResult.errors,
        });

      const persistResult = await persistAnswers(supabase, {
        registrationId,
        responses,
        fields,
        isNew,
      });
      if (!persistResult.ok)
        return errorResponse(
          corsHeaders,
          persistResult.httpStatus,
          persistResult.message,
          undefined,
          {
            error_code: persistResult.errorCode,
          },
        );
    }

    return successResponse(corsHeaders, {
      registration_id: registrationId,
      status,
      is_new: isNew,
      message: isNew ? 'Registration submitted successfully' : 'Registration updated successfully',
    });
  } catch (error) {
    console.error('submit-registration-v2: unexpected error', error);
    return errorResponse(corsHeaders, 500, 'Failed to process registration', undefined, {
      error_code: 'INTERNAL_ERROR',
    });
  }
});
