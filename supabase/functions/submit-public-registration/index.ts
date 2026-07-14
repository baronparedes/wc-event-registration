import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { resolveCompoundScopeKey, selectUniquenessComponentFields } from '@/shared/uniqueness.ts';
import {
  EventFieldWithValidation,
  FieldValidationError,
  buildFieldOptionCapacityWorkItems,
  buildFullCapacityValidationErrors,
  createOptionUsageCounter,
  extractSelectedOptionValuesFromStoredAnswer,
  incrementOptionUsageFromSelection,
  parseRequestBody,
  validateFieldValue,
  z,
} from '@/shared/validation.ts';

const submitPublicRegistrationRequestSchema = z.object({
  event_slug: z.string().trim().min(1, 'event_slug is required'),
  attendee: z.object({
    first_name: z.string().trim().min(1, 'attendee.first_name is required'),
    last_name: z.string().trim().min(1, 'attendee.last_name is required'),
    nickname: z.string().optional().nullable(),
    email: z.string().trim().email('attendee.email must be a valid email address'),
    phone: z.string().optional().nullable(),
  }),
  responses: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1, 'idempotency_key is required'),
});

type SubmitPublicRegistrationRequest = z.infer<typeof submitPublicRegistrationRequestSchema>;

interface SubmitPublicRegistrationSuccess {
  success: true;
  registration_id: string;
  status: 'submitted' | 'updated';
  is_new: boolean;
  message: string;
}

interface SubmitPublicRegistrationError {
  success: false;
  error: string;
  error_code?: string;
  errors?: FieldValidationError[];
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

interface PostgrestErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

interface PublicRegistrationAnswerRow {
  answer_text: string | null;
  answer_json: unknown;
  public_registration_id: string;
  public_registrations: {
    status: string;
  } | null;
}

const REGISTRATION_EVENT_EMAIL_UNIQUE_CONSTRAINT = 'public_registrations_event_email_unique_idx';
const REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT =
  'public_registrations_event_idempotency_unique_idx';

function resolveRegistrationScopeKey(duplicatePolicy: string, idempotencyKey: string): string {
  return duplicatePolicy === 'allow_multiple' || duplicatePolicy === 'allow_multiple_update'
    ? idempotencyKey
    : 'primary';
}

/**
 * Validates a single field value against its schema and validation rules.
 * (Reuses logic from submit-registration)
 */
// Now imported from @/shared/validation.ts

function isUniqueConstraintError(error: PostgrestErrorLike | null, constraint: string): boolean {
  if (!error || error.code !== POSTGRES_ERROR_CODES.uniqueViolation) {
    return false;
  }

  const combinedMessage = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  return combinedMessage.includes(constraint);
}

function isPublicRegistrationUniqueConflict(error: PostgrestErrorLike | null): boolean {
  return (
    isUniqueConstraintError(error, REGISTRATION_EVENT_EMAIL_UNIQUE_CONSTRAINT) ||
    isUniqueConstraintError(error, REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT)
  );
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'submit-public-registration',
    method: 'POST',
    publicRateLimit: {
      scope: 'submit-public-registration',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const parsedBody = await parseRequestBody(req, submitPublicRegistrationRequestSchema);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        } as SubmitPublicRegistrationError),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { event_slug, attendee, responses, idempotency_key }: SubmitPublicRegistrationRequest =
      parsedBody.data;

    const { first_name, last_name, nickname, email, phone } = attendee;

    // Create authenticated client with service role
    const supabase = guard.client;

    // Step 1: Look up event by slug
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, duplicate_policy, allow_public_registrations')
      .eq('slug', event_slug)
      .maybeSingle();

    if (eventError) {
      console.error('Event lookup error:', eventError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'EVENT_LOOKUP_FAILED',
        } as SubmitPublicRegistrationError),
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
        } as SubmitPublicRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Check if public registrations are allowed for this event
    if (!eventData.allow_public_registrations) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Public registrations are not allowed for this event',
          error_code: 'PUBLIC_REGISTRATION_NOT_ALLOWED',
        } as SubmitPublicRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const eventId = eventData.id;
    const duplicatePolicy = eventData.duplicate_policy;
    let registrationId: string | null = null;
    let status: 'submitted' | 'updated' = 'submitted';
    let isNew = true;
    let shouldWriteAnswers = true;

    // Step 2: Fetch event fields for validation
    const { data: fieldsData, error: fieldsError } = await supabase
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
        } as SubmitPublicRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 3: Validate responses against fields
    const fields: EventFieldWithValidation[] = (fieldsData || []).map((f: EventFieldRow) => ({
      id: f.id,
      field_key: f.field_key,
      label: f.label,
      field_type: f.field_type,
      is_required: f.is_required,
      options: Array.isArray(f.options) ? f.options : [],
      validation_rules: f.validation_rules || {},
    }));

    const uniquenessFields = selectUniquenessComponentFields(fieldsData || []);

    const compoundScopeResult = resolveCompoundScopeKey(responses, uniquenessFields);
    if (compoundScopeResult.errors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          error_code: 'VALIDATION_ERROR',
          errors: compoundScopeResult.errors,
        } as SubmitPublicRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const hasCompoundScope = Boolean(compoundScopeResult.scopeKey);
    const registrationScopeKey =
      compoundScopeResult.scopeKey ?? resolveRegistrationScopeKey(duplicatePolicy, idempotency_key);

    if (duplicatePolicy === 'block') {
      const { data: existingForBlock, error: existingForBlockError } = await supabase
        .from('public_registrations')
        .select('id')
        .eq('event_id', eventId)
        .ilike('email', email as string)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingForBlockError) {
        console.error('Block policy precheck error:', existingForBlockError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to process registration',
            error_code: 'REGISTRATION_CHECK_FAILED',
          } as SubmitPublicRegistrationError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      if (existingForBlock?.id) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You have already registered for this event',
            error_code: 'DUPLICATE_REGISTRATION',
          } as SubmitPublicRegistrationError),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    const validationErrors: FieldValidationError[] = [];

    for (const field of fields) {
      const fieldValue = responses[field.field_key];
      const error = validateFieldValue(field.field_key, fieldValue, field);
      if (error) {
        validationErrors.push(error);
      }
    }

    // Enforce option slot limits for constrained option values.
    const capacityWorkItems = buildFieldOptionCapacityWorkItems(fields, responses);

    for (const workItem of capacityWorkItems) {
      const {
        field,
        maxSlotsByOption,
        slotConsumingSelectionsWithoutRole: slotConsumingSelections,
      } = workItem;

      // Public registrations consume slots for global-cap options and wildcard-role options.
      if (slotConsumingSelections.length === 0) {
        continue;
      }

      let answerQuery = supabase
        .from('public_registration_answers')
        .select(
          'answer_text, answer_json, public_registration_id, public_registrations!inner(status)',
        )
        .eq('event_field_id', field.id)
        .neq('public_registrations.status', 'cancelled');

      if (!isNew) {
        answerQuery = answerQuery.neq('public_registration_id', registrationId);
      }

      const { data: existingAnswers, error: slotLookupError } =
        await answerQuery.returns<PublicRegistrationAnswerRow[]>();

      if (slotLookupError) {
        console.error('Public slot capacity lookup error:', slotLookupError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to process registration',
            error_code: 'SLOT_LOOKUP_FAILED',
          } as SubmitPublicRegistrationError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      const usageByOption = createOptionUsageCounter(slotConsumingSelections);

      for (const answer of existingAnswers ?? []) {
        const usedOptions = extractSelectedOptionValuesFromStoredAnswer(field.field_type, {
          answer_text: answer.answer_text,
          answer_json: answer.answer_json,
        });

        incrementOptionUsageFromSelection(usageByOption, slotConsumingSelections, usedOptions);
      }

      validationErrors.push(
        ...buildFullCapacityValidationErrors({
          fieldKey: field.field_key,
          fieldLabel: field.label,
          optionValues: slotConsumingSelections,
          options: field.options,
          maxSlotsByOption,
          usageByOption,
        }),
      );
    }

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          error_code: 'VALIDATION_ERROR',
          errors: validationErrors,
        } as SubmitPublicRegistrationError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 4: Insert or update registration

    const { data: newReg, error: createError } = await supabase
      .from('public_registrations')
      .insert({
        event_id: eventId,
        registration_scope_key: registrationScopeKey,
        first_name: (first_name as string).trim(),
        last_name: (last_name as string).trim(),
        nickname: typeof nickname === 'string' ? (nickname as string).trim() : null,
        email: (email as string).trim(),
        phone: typeof phone === 'string' ? (phone as string).trim() : null,
        idempotency_key: idempotency_key,
        status: 'submitted',
      })
      .select('id')
      .single();

    if (!createError && newReg) {
      registrationId = newReg.id;
    } else if (
      createError &&
      isPublicRegistrationUniqueConflict(createError as PostgrestErrorLike)
    ) {
      const isIdempotencyConflict = isUniqueConstraintError(
        createError as PostgrestErrorLike,
        REGISTRATION_EVENT_IDEMPOTENCY_UNIQUE_CONSTRAINT,
      );

      if (isIdempotencyConflict) {
        const { data: existingByIdempotency, error: idempotencyLookupError } = await supabase
          .from('public_registrations')
          .select('id, status')
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
            } as SubmitPublicRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        if (existingByIdempotency?.id) {
          registrationId = existingByIdempotency.id;
          status = existingByIdempotency.status === 'updated' ? 'updated' : 'submitted';
          isNew = false;
          shouldWriteAnswers = false;
        }
      }

      if (!registrationId) {
        if (hasCompoundScope) {
          if (duplicatePolicy === 'allow_multiple_update') {
            const { data: existingByScope, error: scopeLookupError } = await supabase
              .from('public_registrations')
              .select('id, status')
              .eq('event_id', eventId)
              .eq('registration_scope_key', registrationScopeKey)
              .ilike('email', email as string)
              .maybeSingle();

            if (scopeLookupError) {
              console.error('Compound-scope conflict recovery check error:', scopeLookupError);
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'Failed to process registration',
                  error_code: 'REGISTRATION_CHECK_FAILED',
                } as SubmitPublicRegistrationError),
                {
                  status: 500,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                },
              );
            }

            if (!existingByScope) {
              console.error(
                'Compound-scope conflict recovery failed: row missing after unique conflict',
                {
                  eventId,
                  email,
                  registrationScopeKey,
                },
              );
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'A registration with the same unique field values already exists.',
                  error_code: 'duplicate_compound_key',
                } as SubmitPublicRegistrationError),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                },
              );
            }

            registrationId = existingByScope.id;
            status = 'updated';
            isNew = false;
          }

          if (!registrationId) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'A registration with the same unique field values already exists.',
                error_code: 'duplicate_compound_key',
              } as SubmitPublicRegistrationError),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }
        }

        if (duplicatePolicy === 'allow_multiple') {
          console.error('Allow-multiple public registration conflict without idempotency match', {
            eventId,
            email,
            idempotencyKey: idempotency_key,
          });
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'REGISTRATION_CONFLICT_RECOVERY_FAILED',
            } as SubmitPublicRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }

        if (duplicatePolicy === 'allow_multiple_update') {
          const { data: existingByScopeForUpdate, error: scopeRecoveryError } = await supabase
            .from('public_registrations')
            .select('id, status')
            .eq('event_id', eventId)
            .eq('registration_scope_key', registrationScopeKey)
            .ilike('email', email as string)
            .maybeSingle();

          if (scopeRecoveryError) {
            console.error('Allow-multiple-update scope recovery check error:', scopeRecoveryError);
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Failed to process registration',
                error_code: 'REGISTRATION_CHECK_FAILED',
              } as SubmitPublicRegistrationError),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }

          if (existingByScopeForUpdate?.id) {
            registrationId = existingByScopeForUpdate.id;
            status = 'updated';
            isNew = false;
          } else {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'A registration with the same unique field values already exists.',
                error_code: 'duplicate_compound_key',
              } as SubmitPublicRegistrationError),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }
        }

        if (!registrationId) {
          const { data: existingReg, error: regCheckError } = await supabase
            .from('public_registrations')
            .select('id, status')
            .eq('event_id', eventId)
            .eq('registration_scope_key', 'primary')
            .ilike('email', email as string)
            .maybeSingle();

          if (regCheckError) {
            console.error('Registration conflict recovery check error:', regCheckError);
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Failed to process registration',
                error_code: 'REGISTRATION_CHECK_FAILED',
              } as SubmitPublicRegistrationError),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }

          if (!existingReg) {
            if (duplicatePolicy === 'allow_multiple_update') {
              return new Response(
                JSON.stringify({
                  success: false,
                  error: 'A registration with the same unique field values already exists.',
                  error_code: 'duplicate_compound_key',
                } as SubmitPublicRegistrationError),
                {
                  status: 200,
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                },
              );
            }

            console.error('Unique constraint violation but no existing registration found');
            return new Response(
              JSON.stringify({
                success: false,
                error: 'Failed to process registration',
                error_code: 'DUPLICATE_REGISTRATION',
              } as SubmitPublicRegistrationError),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }

          // Existing registration found
          if (duplicatePolicy === 'block') {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'You have already registered for this event',
                error_code: 'DUPLICATE_REGISTRATION',
              } as SubmitPublicRegistrationError),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              },
            );
          }

          // duplicatePolicy === 'allow_update'
          registrationId = existingReg.id;
          status = 'updated';
          isNew = false;
        }
      }
    } else if (createError) {
      console.error('Registration insert error:', createError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'REGISTRATION_INSERT_FAILED',
        } as SubmitPublicRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!registrationId) {
      console.error('Failed to obtain registration ID');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process registration',
          error_code: 'REGISTRATION_ID_NOT_OBTAINED',
        } as SubmitPublicRegistrationError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 5: Write answers if needed
    if (shouldWriteAnswers && fields.length > 0) {
      // Delete existing answers for update case
      if (!isNew) {
        const { error: deleteError } = await supabase
          .from('public_registration_answers')
          .delete()
          .eq('public_registration_id', registrationId);

        if (deleteError) {
          console.error('Delete existing answers error:', deleteError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to process registration',
              error_code: 'DELETE_ANSWERS_FAILED',
            } as SubmitPublicRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }

      // Insert new answers
      const answersToInsert = fields
        .map((field) => {
          const value = responses[field.field_key];

          // Skip empty optional fields
          if (value === null || value === undefined || value === '') {
            return null;
          }

          let answerText: string | null = null;
          let answerNumber: number | null = null;
          let answerBoolean: boolean | null = null;
          let answerDate: string | null = null;
          let answerJson: unknown | null = null;

          if (field.field_type === 'number') {
            answerNumber = typeof value === 'number' ? value : Number(value);
          } else if (field.field_type === 'boolean') {
            answerBoolean = value === true || value === 'true' || value === 1 ? true : false;
          } else if (field.field_type === 'date') {
            answerDate = String(value);
          } else if (
            field.field_type === 'multi_select' ||
            field.field_type === 'multi_select_toggle'
          ) {
            answerJson =
              field.field_type === 'multi_select_toggle'
                ? value
                : Array.isArray(value)
                  ? value
                  : [value];
          } else {
            answerText = String(value);
          }

          return {
            public_registration_id: registrationId,
            event_field_id: field.id,
            answer_text: answerText,
            answer_number: answerNumber,
            answer_boolean: answerBoolean,
            answer_date: answerDate,
            answer_json: answerJson,
          };
        })
        .filter((a) => a !== null);

      if (answersToInsert.length > 0) {
        const { error: insertAnswersError } = await supabase
          .from('public_registration_answers')
          .insert(answersToInsert);

        if (insertAnswersError) {
          console.error('Insert answers error:', insertAnswersError);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Failed to save registration answers',
              error_code: 'INSERT_ANSWERS_FAILED',
            } as SubmitPublicRegistrationError),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          );
        }
      }
    }

    // Step 6: Update registration status if it was updated
    if (!isNew && status === 'updated') {
      const { error: updateError } = await supabase
        .from('public_registrations')
        .update({ status: 'updated' })
        .eq('id', registrationId);

      if (updateError) {
        console.error('Update status error:', updateError);
      }
    }

    const response: SubmitPublicRegistrationSuccess = {
      success: true,
      registration_id: registrationId,
      status,
      is_new: isNew,
      message: isNew ? 'Registration submitted successfully' : 'Registration updated successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred',
        error_code: 'INTERNAL_ERROR',
      } as SubmitPublicRegistrationError),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
