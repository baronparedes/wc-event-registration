import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforcePublicRateLimit,
  isOriginAllowed,
  readAllowedOrigins,
} from '@/shared/security.ts';
import {
  EventFieldWithValidation,
  FieldValidationError,
  parseFunctionEnvironment,
  parseRequestBody,
  validateFieldValue,
  z,
} from '@/shared/validation.ts';

const submitRegistrationRequestSchema = z.object({
  event_slug: z.string().trim().min(1, 'event_slug is required'),
  member_id: z.string().trim().min(1, 'member_id is required'),
  responses: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1, 'idempotency_key is required'),
});

type SubmitRegistrationRequest = z.infer<typeof submitRegistrationRequestSchema>;

interface SubmitRegistrationSuccess {
  success: true;
  registration_id: string;
  status: 'submitted' | 'updated';
  is_new: boolean;
  message: string;
}

interface SubmitRegistrationError {
  success: false;
  error: string;
  error_code?: string;
  errors?: FieldValidationError[];
}

interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

const REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT = 'registrations_event_user_unique_idx';
const REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT =
  'registrations_event_idempotency_unique_idx';

function isUniqueConstraintError(error: PostgrestErrorLike | null, constraint: string): boolean {
  if (!error || error.code !== POSTGRES_ERROR_CODES.uniqueViolation) {
    return false;
  }

  const combinedMessage = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  return combinedMessage.includes(constraint);
}

function isRegistrationUniqueConflict(error: PostgrestErrorLike | null): boolean {
  return (
    isUniqueConstraintError(error, REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT) ||
    isUniqueConstraintError(error, REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT)
  );
}

const allowedOrigins = readAllowedOrigins();

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return createObscuredDenyResponse(corsHeaders);
    }

    return new Response('ok', { headers: corsHeaders });
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return createObscuredDenyResponse(corsHeaders);
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rateLimitResponse = enforcePublicRateLimit({
    req,
    origin,
    corsHeaders,
    scope: 'submit-registration',
    windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
    maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const env = parseFunctionEnvironment();

    if (!env) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Environment not configured',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
    const { supabaseUrl, supabaseServiceKey } = env;

    const parsedBody = await parseRequestBody(req, submitRegistrationRequestSchema);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { event_slug, member_id, responses, idempotency_key }: SubmitRegistrationRequest =
      parsedBody.data;

    // Create authenticated client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Step 1: Look up event by slug
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, duplicate_policy')
      .eq('slug', event_slug)
      .maybeSingle();

    if (eventError) {
      console.error('Event lookup error:', eventError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'EVENT_LOOKUP_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!eventData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Event not found',
          error_code: 'EVENT_NOT_FOUND',
        } as SubmitRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 2: Look up user by member_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('member_id', member_id)
      .maybeSingle();

    if (userError) {
      console.error('User lookup error:', userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'USER_LOOKUP_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Member not found',
          error_code: 'MEMBER_NOT_FOUND',
        } as SubmitRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userId = userData.id;
    const eventId = eventData.id;
    const duplicatePolicy = eventData.duplicate_policy;

    // Step 3: Insert registration first, then recover from unique conflicts.
    let registrationId: string | null = null;
    let status: 'submitted' | 'updated' = 'submitted';
    let isNew = true;
    let shouldWriteAnswers = true;

    const { data: newReg, error: createError } = await supabase
      .from('registrations')
      .insert({
        event_id: eventId,
        user_id: userId,
        idempotency_key: idempotency_key,
        status: 'submitted',
        source: 'public',
      })
      .select('id')
      .single();

    if (!createError && newReg) {
      registrationId = newReg.id;
    } else if (createError && isRegistrationUniqueConflict(createError as PostgrestErrorLike)) {
      const isIdempotencyConflict = isUniqueConstraintError(
        createError as PostgrestErrorLike,
        REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT,
      );

      if (isIdempotencyConflict) {
        const { data: existingByIdempotency, error: idempotencyLookupError } = await supabase
          .from('registrations')
          .select('id, user_id, status')
          .eq('event_id', eventId)
          .eq('idempotency_key', idempotency_key)
          .maybeSingle();

        if (idempotencyLookupError) {
          console.error('Idempotency recovery lookup error:', idempotencyLookupError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_IDEMPOTENCY_RECOVERY_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        if (existingByIdempotency?.id && existingByIdempotency.user_id === userId) {
          registrationId = existingByIdempotency.id;
          status = existingByIdempotency.status === 'updated' ? 'updated' : 'submitted';
          isNew = false;
          shouldWriteAnswers = false;
        }
      }

      if (!registrationId) {
        const { data: existingReg, error: regCheckError } = await supabase
          .from('registrations')
          .select('id, status')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .maybeSingle();

        if (regCheckError) {
          console.error('Registration conflict recovery check error:', regCheckError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_CHECK_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        if (!existingReg) {
          console.error(
            'Registration conflict recovery failed: row missing after unique conflict',
            {
              eventId,
              userId,
              idempotencyKey: idempotency_key,
            },
          );
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_CONFLICT_RECOVERY_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        if (duplicatePolicy === 'block') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Already registered for this event',
              error_code: 'duplicate_blocked',
            } as SubmitRegistrationError),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        registrationId = existingReg.id;
        status = 'updated';
        isNew = false;

        const { error: updateError } = await supabase
          .from('registrations')
          .update({ status: 'updated', submitted_at: new Date().toISOString() })
          .eq('id', registrationId);

        if (updateError) {
          console.error('Registration update error:', updateError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_UPDATE_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
    } else {
      console.error('Registration create error:', createError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'REGISTRATION_CREATE_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!registrationId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'REGISTRATION_RESOLUTION_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!shouldWriteAnswers) {
      return new Response(
        JSON.stringify({
          success: true,
          registration_id: registrationId,
          status,
          is_new: isNew,
          message:
            status === 'updated'
              ? 'Registration updated successfully'
              : 'Registration submitted successfully',
        } as SubmitRegistrationSuccess),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 4: Get event fields with validation rules
    const { data: eventFields, error: fieldsError } = await supabase
      .from('event_fields')
      .select('id, field_key, label, field_type, is_required, options, validation_rules')
      .eq('event_id', eventId)
      .eq('is_active', true);

    if (fieldsError) {
      console.error('Fields lookup error:', fieldsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'FIELDS_LOOKUP_FAILED',
        } as SubmitRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 5: Validate all response values against field schemas
    const fieldMap = new Map(
      (eventFields || []).map((f) => [f.field_key, f as EventFieldWithValidation]),
    );
    const validationErrors: FieldValidationError[] = [];

    for (const [fieldKey, value] of Object.entries(responses)) {
      const field = fieldMap.get(fieldKey);
      if (!field) {
        // Unknown field in responses - skip (could be old data)
        continue;
      }

      const error = validateFieldValue(fieldKey, value, field);
      if (error) {
        validationErrors.push(error);
      }
    }

    // Check for missing required fields
    for (const [fieldKey, field] of fieldMap) {
      if (field.is_required && !(fieldKey in responses)) {
        validationErrors.push({
          fieldKey,
          message: `${field.label} is required.`,
        });
      }
    }

    if (validationErrors.length > 0) {
      console.warn('Registration validation failed:', validationErrors);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          error_code: 'VALIDATION_FAILED',
          errors: validationErrors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 6: Delete existing answers if updating (clean slate)
    if (!isNew) {
      const { error: deleteAnswersError } = await supabase
        .from('registration_answers')
        .delete()
        .eq('registration_id', registrationId);

      if (deleteAnswersError) {
        console.error('Delete answers error:', deleteAnswersError);
        // Continue - not fatal
      }
    }

    // Step 7: Insert registration answers
    const fieldIdMap = new Map((eventFields || []).map((f) => [f.field_key, f.id]));
    const answersToInsert = Object.entries(responses)
      .map(([fieldKey, answer]) => {
        const fieldId = fieldIdMap.get(fieldKey);
        if (!fieldId) {
          console.warn(`Field ${fieldKey} not found in event`);
          return null;
        }

        // Simple type mapping: assume string for now
        return {
          registration_id: registrationId,
          event_field_id: fieldId,
          answer_text: typeof answer === 'string' ? answer : JSON.stringify(answer),
        };
      })
      .filter((a) => a !== null);

    if (answersToInsert.length > 0) {
      const { error: answersError } = await supabase
        .from('registration_answers')
        .insert(answersToInsert);

      if (answersError) {
        console.error('Answers insert error:', answersError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to process registration',
            error_code: 'ANSWERS_INSERT_FAILED',
          } as SubmitRegistrationError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        registration_id: registrationId,
        status,
        is_new: isNew,
        message: isNew
          ? 'Registration submitted successfully'
          : 'Registration updated successfully',
      } as SubmitRegistrationSuccess),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Unexpected error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process registration',
        error_code: 'INTERNAL_ERROR',
      } as SubmitRegistrationError),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
