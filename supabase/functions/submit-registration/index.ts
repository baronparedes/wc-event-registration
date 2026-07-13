import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  enforcePublicRateLimit,
  isOriginAllowed,
  readAllowedOrigins,
} from '@/shared/security.ts';
import { resolveCompoundScopeKey, selectUniquenessComponentFields } from '@/shared/uniqueness.ts';
import {
  EventFieldWithValidation,
  FieldValidationError,
  buildFieldOptionCapacityWorkItems,
  buildFullCapacityValidationErrors,
  createOptionUsageCounter,
  extractSelectedOptionValuesFromStoredAnswer,
  incrementOptionUsageFromSelection,
  normalizePrimaryRoleValue,
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

interface RegistrationAnswerRow {
  answer_text: string | null;
  registration_id: string;
  registrations: {
    status: string;
    user_id: string;
  } | null;
}

interface UserRoleRow {
  id: string;
  role: string;
}

interface UserLookupRow {
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

function extractMemberRole(role: string | null): string | null {
  return normalizePrimaryRoleValue(role);
}

const REGISTRATION_EVENT_USER_UNIQUE_CONSTRAINT = 'registrations_event_user_unique_idx';
const REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT =
  'registrations_event_idempotency_unique_idx';

function resolveRegistrationScopeKey(duplicatePolicy: string, idempotencyKey: string): string {
  return duplicatePolicy === 'allow_multiple' ? idempotencyKey : 'primary';
}

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
      .select('id, role')
      .eq('member_id', member_id)
      .maybeSingle<UserLookupRow>();

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
    const memberRole = extractMemberRole(userData.role);
    const eventId = eventData.id;
    const duplicatePolicy = eventData.duplicate_policy;

    const { data: eventFieldsData, error: fieldsError } = await supabase
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

    const eventFields: EventFieldWithValidation[] = (eventFieldsData || []).map(
      (field: EventFieldRow) => ({
        id: field.id,
        field_key: field.field_key,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        options: Array.isArray(field.options) ? field.options : [],
        validation_rules: field.validation_rules || {},
      }),
    );

    const uniquenessFields = selectUniquenessComponentFields(eventFieldsData || []);

    const compoundScopeResult = resolveCompoundScopeKey(responses, uniquenessFields);
    if (compoundScopeResult.errors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          error_code: 'VALIDATION_FAILED',
          errors: compoundScopeResult.errors,
        } as SubmitRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const hasCompoundScope = Boolean(compoundScopeResult.scopeKey);
    const registrationScopeKey =
      compoundScopeResult.scopeKey ?? resolveRegistrationScopeKey(duplicatePolicy, idempotency_key);

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
        registration_scope_key: registrationScopeKey,
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
        if (hasCompoundScope) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'A registration with the same unique field values already exists.',
              error_code: 'duplicate_compound_key',
            } as SubmitRegistrationError),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        if (duplicatePolicy === 'allow_multiple') {
          console.error('Allow-multiple registration conflict without idempotency match', {
            eventId,
            userId,
            idempotencyKey: idempotency_key,
          });
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

        const { data: existingReg, error: regCheckError } = await supabase
          .from('registrations')
          .select('id, status')
          .eq('event_id', eventId)
          .eq('user_id', userId)
          .eq('registration_scope_key', 'primary')
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

    // Step 4: Validate all response values against field schemas
    const fieldMap = new Map(eventFields.map((f) => [f.field_key, f as EventFieldWithValidation]));
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

    // Enforce option slot limits for constrained option values.
    const capacityWorkItems = buildFieldOptionCapacityWorkItems(
      Array.from(fieldMap.values()),
      responses,
    );

    for (const workItem of capacityWorkItems) {
      const { field, fieldKey, maxSlotsByOption, roleAllotmentsByOption, constrainedSelections } =
        workItem;

      let answerQuery = supabase
        .from('registration_answers')
        .select('answer_text, registration_id, registrations!inner(status,user_id)')
        .eq('event_field_id', field.id)
        .neq('registrations.status', 'cancelled');

      if (!isNew) {
        answerQuery = answerQuery.neq('registration_id', registrationId);
      }

      const { data: existingAnswers, error: slotLookupError } =
        await answerQuery.returns<RegistrationAnswerRow[]>();

      if (slotLookupError) {
        console.error('Slot capacity lookup error:', slotLookupError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to process registration',
            error_code: 'SLOT_LOOKUP_FAILED',
          } as SubmitRegistrationError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const registrationUserIds = Array.from(
        new Set(
          (existingAnswers ?? [])
            .map((answer) => answer.registrations?.user_id)
            .filter((userId): userId is string => Boolean(userId)),
        ),
      );

      const userRoleMap = new Map<string, string | null>();
      if (registrationUserIds.length > 0) {
        const { data: usersWithRole, error: roleLookupError } = await supabase
          .from('users')
          .select('id, role')
          .in('id', registrationUserIds)
          .returns<UserRoleRow[]>();

        if (roleLookupError) {
          console.error('Role lookup error during slot validation:', roleLookupError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'ROLE_LOOKUP_FAILED',
            } as SubmitRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        for (const user of usersWithRole ?? []) {
          userRoleMap.set(user.id, extractMemberRole(user.role));
        }
      }

      const usageByOption = createOptionUsageCounter(constrainedSelections);
      const usageByOptionAndRole = constrainedSelections.reduce<
        Record<string, Record<string, number>>
      >((acc, option) => {
        acc[option] = {};
        return acc;
      }, {});

      for (const answer of existingAnswers ?? []) {
        const usedOptions = extractSelectedOptionValuesFromStoredAnswer(field.field_type, {
          answer_text: answer.answer_text,
        });

        for (const option of constrainedSelections) {
          if (usedOptions.includes(option)) {
            const roleAllotmentsForOption = roleAllotmentsByOption[option] ?? {};
            const hasRoleAllotments = Object.keys(roleAllotmentsForOption).length > 0;
            const wildcardCap = roleAllotmentsForOption['*'];

            if (!hasRoleAllotments) {
              // Max-slots-only mode: each registration consumes one slot.
              incrementOptionUsageFromSelection(usageByOption, [option], usedOptions);
              continue;
            }

            if (typeof wildcardCap === 'number') {
              incrementOptionUsageFromSelection(usageByOption, [option], usedOptions);
              const perRoleUsage = usageByOptionAndRole[option] ?? {};
              perRoleUsage['*'] = (perRoleUsage['*'] ?? 0) + 1;
              usageByOptionAndRole[option] = perRoleUsage;
              continue;
            }

            const answerUserId = answer.registrations?.user_id;
            const existingRole = answerUserId ? userRoleMap.get(answerUserId) : null;

            if (!existingRole || roleAllotmentsForOption[existingRole] === undefined) {
              // Roles not found in configured allotments do not consume slots.
              continue;
            }

            incrementOptionUsageFromSelection(usageByOption, [option], usedOptions);
            const perRoleUsage = usageByOptionAndRole[option] ?? {};
            perRoleUsage[existingRole] = (perRoleUsage[existingRole] ?? 0) + 1;
            usageByOptionAndRole[option] = perRoleUsage;
          }
        }
      }

      const optionsEligibleForGlobalCap: string[] = [];

      for (const option of constrainedSelections) {
        const roleAllotmentsForOption = roleAllotmentsByOption[option] ?? {};
        const hasRoleAllotments = Object.keys(roleAllotmentsForOption).length > 0;
        const wildcardCap = roleAllotmentsForOption['*'];
        const roleCapForMember = memberRole ? roleAllotmentsForOption[memberRole] : undefined;

        if (hasRoleAllotments) {
          if (typeof wildcardCap === 'number') {
            const usedWildcardSlots = usageByOptionAndRole[option]?.['*'] ?? 0;
            if (usedWildcardSlots >= wildcardCap) {
              const optionLabel =
                field.options.find((entry) => entry.value === option)?.label ?? option;
              validationErrors.push({
                fieldKey,
                message: `${field.label} option "${optionLabel}" already reached the allotted slots for all roles.`,
              });
            }

            continue;
          }

          // Unconfigured roles do not consume slots and are not blocked by slot caps.
          if (roleCapForMember === undefined) {
            continue;
          }

          const usedSlotsForRole = memberRole
            ? (usageByOptionAndRole[option]?.[memberRole] ?? 0)
            : 0;

          if (typeof roleCapForMember === 'number' && usedSlotsForRole >= roleCapForMember) {
            const optionLabel =
              field.options.find((entry) => entry.value === option)?.label ?? option;
            validationErrors.push({
              fieldKey,
              message: `${field.label} option "${optionLabel}" already reached the allotted slots for role "${memberRole}".`,
            });
            continue;
          }
        }

        optionsEligibleForGlobalCap.push(option);
      }

      validationErrors.push(
        ...buildFullCapacityValidationErrors({
          fieldKey,
          fieldLabel: field.label,
          optionValues: optionsEligibleForGlobalCap,
          options: field.options,
          maxSlotsByOption,
          usageByOption,
        }),
      );
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
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 5: Delete existing answers if updating (clean slate)
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

    // Step 6: Insert registration answers
    const fieldIdMap = new Map(eventFields.map((f) => [f.field_key, f.id]));
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
