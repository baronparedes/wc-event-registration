import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import {
  EventFieldWithValidation,
  FieldValidationError,
  parseRequestBody,
  validateFieldValue,
  z,
} from '../_shared/validation.ts';

const submitFormSubmissionRequestSchema = z.object({
  form_slug: z.string().trim().min(1, 'form_slug is required'),
  member_id: z.string().trim().optional(),
  public_registrant_info: z
    .object({
      first_name: z.string().trim().optional(),
      last_name: z.string().trim().optional(),
      email: z.string().trim().email().optional(),
      phone: z.string().trim().optional(),
    })
    .optional(),
  responses: z.record(z.string(), z.unknown()),
  idempotency_key: z.string().trim().min(1, 'idempotency_key is required'),
});

type SubmitFormSubmissionRequest = z.infer<typeof submitFormSubmissionRequestSchema>;

interface SubmitFormSubmissionSuccess {
  success: true;
  submission_id: string;
  status: 'submitted' | 'updated';
  is_new: boolean;
  message: string;
}

interface SubmitFormSubmissionError {
  success: false;
  error: string;
  error_code?: string;
  errors?: FieldValidationError[];
}

interface FormFieldRow {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  field_applicability: string;
  is_required: boolean;
  options: unknown;
  validation_rules: unknown;
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'submit-form-submission',
    method: 'POST',
    publicRateLimit: {
      scope: 'submit-form-submission',
      windowMs: RATE_LIMIT_PRESETS.submitRegistration.windowMs,
      maxHits: RATE_LIMIT_PRESETS.submitRegistration.maxHits,
    },
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const parsedBody = await parseRequestBody(req, submitFormSubmissionRequestSchema);
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

    const {
      form_slug,
      member_id,
      public_registrant_info,
      responses,
      idempotency_key,
    }: SubmitFormSubmissionRequest = parsedBody.data;

    const supabase = guard.client;

    // Step 1: Look up form by slug
    const { data: formData, error: formError } = await supabase
      .from('forms')
      .select('id, duplicate_policy, audience, status')
      .eq('slug', form_slug)
      .eq('status', 'published')
      .maybeSingle();

    if (formError) {
      console.error('Form lookup error:', formError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process form submission',
          error_code: 'FORM_LOOKUP_FAILED',
        } as SubmitFormSubmissionError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!formData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Form not found or not currently active',
          error_code: 'FORM_NOT_FOUND',
        } as SubmitFormSubmissionError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 2: Handle Member lookup if member_id is supplied
    let userId: string | null = null;
    if (member_id) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('member_id', member_id)
        .maybeSingle();

      if (userError || !userData) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Member not found',
            error_code: 'MEMBER_NOT_FOUND',
          } as SubmitFormSubmissionError),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      userId = userData.id;
    }

    const formId = formData.id;
    const duplicatePolicy = formData.duplicate_policy;

    // Step 3: Fetch active form fields
    const { data: formFieldsData, error: fieldsError } = await supabase
      .from('form_fields')
      .select(
        'id, field_key, label, field_type, field_applicability, is_required, options, validation_rules',
      )
      .eq('form_id', formId)
      .eq('is_active', true);

    if (fieldsError) {
      console.error('Form fields lookup error:', fieldsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to process form submission',
          error_code: 'FIELDS_LOOKUP_FAILED',
        } as SubmitFormSubmissionError),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const formFields: EventFieldWithValidation[] = (formFieldsData || []).map(
      (field: FormFieldRow) => ({
        id: field.id,
        field_key: field.field_key,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        options: Array.isArray(field.options) ? field.options : [],
        validation_rules: field.validation_rules || {},
      }),
    );

    // Step 4: Validate responses
    const fieldMap = new Map(formFields.map((f) => [f.field_key, f as EventFieldWithValidation]));
    const validationErrors: FieldValidationError[] = [];

    for (const [fieldKey, value] of Object.entries(responses)) {
      const field = fieldMap.get(fieldKey);
      if (!field) continue;

      const error = validateFieldValue(fieldKey, value, field);
      if (error) {
        validationErrors.push(error);
      }
    }

    for (const [fieldKey, field] of fieldMap) {
      if (field.is_required && !(fieldKey in responses)) {
        validationErrors.push({
          fieldKey,
          message: `${field.label} is required.`,
        });
      }
    }

    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Validation failed',
          error_code: 'VALIDATION_FAILED',
          errors: validationErrors,
        } as SubmitFormSubmissionError),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Duplicate policy precheck for members
    if (userId && duplicatePolicy === 'block') {
      const { data: existingSub } = await supabase
        .from('form_submissions')
        .select('id')
        .eq('form_id', formId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSub) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You have already submitted this form.',
            error_code: 'duplicate_blocked',
          } as SubmitFormSubmissionError),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    let submissionId: string | null = null;
    let status: 'submitted' | 'updated' = 'submitted';
    let isNew = true;

    // Check for existing submission under allow_update
    if (
      userId &&
      (duplicatePolicy === 'allow_update' || duplicatePolicy === 'allow_multiple_update')
    ) {
      const { data: existingSub } = await supabase
        .from('form_submissions')
        .select('id')
        .eq('form_id', formId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingSub) {
        submissionId = existingSub.id;
        status = 'updated';
        isNew = false;
        await supabase
          .from('form_submissions')
          .update({ submitted_at: new Date().toISOString() })
          .eq('id', submissionId);
      }
    }

    if (!submissionId) {
      const { data: newSub, error: createError } = await supabase
        .from('form_submissions')
        .insert({
          form_id: formId,
          user_id: userId,
          public_registrant_info: public_registrant_info || {},
          idempotency_key: idempotency_key,
          status: 'submitted',
          source: userId ? 'member' : 'public',
        })
        .select('id')
        .single();

      if (createError || !newSub) {
        console.error('Form submission create error:', createError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to record submission',
            error_code: 'SUBMISSION_CREATE_FAILED',
          } as SubmitFormSubmissionError),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      submissionId = newSub.id;
    }

    // Clear old answers if updating
    if (!isNew && submissionId) {
      await supabase.from('form_submission_answers').delete().eq('submission_id', submissionId);
    }

    // Insert answers
    const fieldIdMap = new Map(formFields.map((f) => [f.field_key, f.id]));
    const answersToInsert = Object.entries(responses)
      .map(([fieldKey, answer]) => {
        const fieldId = fieldIdMap.get(fieldKey);
        if (!fieldId) return null;
        return {
          submission_id: submissionId,
          form_field_id: fieldId,
          answer_text: typeof answer === 'string' ? answer : JSON.stringify(answer),
        };
      })
      .filter((a) => a !== null);

    if (answersToInsert.length > 0) {
      const { error: answersError } = await supabase
        .from('form_submission_answers')
        .insert(answersToInsert);

      if (answersError) {
        console.error('Answers insert error:', answersError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to record form answers',
            error_code: 'ANSWERS_INSERT_FAILED',
          } as SubmitFormSubmissionError),
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
        submission_id: submissionId,
        status,
        is_new: isNew,
        message: isNew ? 'Form submitted successfully' : 'Form submission updated successfully',
      } as SubmitFormSubmissionSuccess),
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
        error: 'Failed to process form submission',
        error_code: 'INTERNAL_ERROR',
      } as SubmitFormSubmissionError),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
