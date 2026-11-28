import { RATE_LIMIT_PRESETS } from '../_shared/constants.ts';
import type { Json } from '../_shared/database.types.ts';
import { useEdgeHook } from '../_shared/edge.ts';
import { z } from '../_shared/validation.ts';

const dynamicFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
  toggle_label: z.string().optional(),
  toggle_default: z.boolean().optional(),
});

const dynamicFieldSchema = z.object({
  id: z.string().optional(),
  field_key: z.string().trim().min(1),
  label: z.string(),
  field_type: z.enum([
    'text',
    'textarea',
    'number',
    'email',
    'phone',
    'select',
    'radio',
    'checkbox',
    'multi_select',
    'multi_select_toggle',
    'date',
    'datetime',
    'boolean',
    'color_picker',
    'rating',
    'required_approval',
  ]),
  is_required: z.boolean(),
  is_active: z.boolean().optional(),
  placeholder: z.string().nullable().optional(),
  help_text: z.string().nullable().optional(),
  options: z.array(dynamicFieldOptionSchema).optional(),
  validation_rules: z.record(z.string(), z.unknown()).optional(),
  display_order: z.number().int().optional(),
});

const updateRecruitmentSettingsSchema = z.object({
  is_recruitment_open: z.boolean(),
  eligibility_rules: z
    .object({
      min_age: z.number().int().min(0),
      max_age: z.number().int().min(0),
      requires_glc1_completed: z.boolean(),
      min_dgroup_months: z.number().int().min(0),
    })
    .refine((rules) => rules.max_age >= rules.min_age, {
      message: 'Maximum age must be greater than or equal to minimum age',
      path: ['max_age'],
    }),
  vmt_registration_url: z.string().trim().url().or(z.literal('')),
  orientation_instructions: z.string().trim().max(5000),
  survey_questions: z
    .array(
      dynamicFieldSchema.extend({
        correct_answer: z.enum(['true', 'false']),
        explanation: z.string().optional(),
      }),
    )
    .min(1)
    .refine((questions) => questions.some((question) => question.is_active === true), {
      message: 'At least one survey question must be active',
    }),
  endorsement_questions: z
    .array(dynamicFieldSchema)
    .min(1)
    .refine((questions) => questions.some((question) => question.is_active === true), {
      message: 'At least one endorsement question must be active',
    }),
  categories: z.array(z.string().trim().min(1).max(64)).min(1).optional(),
  role_overview_intro: z.string().trim().max(2000).optional(),
  role_responsibilities: z.record(z.string().trim().min(1), z.string().max(4000)).optional(),
  privacy_waiver_notice: z.string().trim().max(5000).optional(),
  applicant_attestation: z.array(z.string().trim().min(1).max(1000)).optional(),
  applicant_attestation_confirmation: z.string().trim().max(2000).optional(),
});

function response(
  status: number,
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export async function handleUpdateRecruitmentSettings(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'update-recruitment-settings',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin'],
    rateLimit: {
      scope: 'update-recruitment-settings',
      windowMs: RATE_LIMIT_PRESETS.updateAttendanceSettings.windowMs,
      maxHits: RATE_LIMIT_PRESETS.updateAttendanceSettings.maxHits,
    },
    schema: updateRecruitmentSettingsSchema,
  });

  if (!guard.valid) return guard.response;

  const { data: existingRow } = await guard.client
    .from('app_settings')
    .select('value')
    .eq('key', 'recruitment')
    .maybeSingle();

  const existingValue =
    existingRow &&
    existingRow.value &&
    typeof existingRow.value === 'object' &&
    !Array.isArray(existingRow.value)
      ? (existingRow.value as Record<string, unknown>)
      : {};

  const {
    eligibility_rules,
    survey_questions,
    endorsement_questions,
    categories,
    role_overview_intro,
    role_responsibilities,
    privacy_waiver_notice,
    applicant_attestation,
    applicant_attestation_confirmation,
    ...settings
  } = guard.data;

  const mergedValue: Record<string, unknown> = {
    ...existingValue,
    ...settings,
    eligibility_rules,
    survey_questions,
    endorsement_questions,
    ...(categories !== undefined ? { categories } : {}),
    ...(role_overview_intro !== undefined ? { role_overview_intro } : {}),
    ...(role_responsibilities !== undefined ? { role_responsibilities } : {}),
    ...(privacy_waiver_notice !== undefined ? { privacy_waiver_notice } : {}),
    ...(applicant_attestation !== undefined ? { applicant_attestation } : {}),
    ...(applicant_attestation_confirmation !== undefined
      ? { applicant_attestation_confirmation }
      : {}),
  };

  const { data, error } = await guard.client
    .from('app_settings')
    .upsert(
      {
        key: 'recruitment',
        value: asJson(mergedValue),
        is_public: false,
        updated_by: guard.userId ?? null,
      },
      { onConflict: 'key' },
    )
    .select('value, updated_at')
    .single();

  if (error || !data) {
    console.error('Recruitment settings update failed:', error);
    return response(
      500,
      { success: false, error: 'Failed to update recruitment settings' },
      guard.corsHeaders,
    );
  }

  const savedValue =
    data.value && typeof data.value === 'object' && !Array.isArray(data.value)
      ? (data.value as Record<string, unknown>)
      : mergedValue;

  return response(
    200,
    {
      success: true,
      settings: {
        id: 1,
        ...savedValue,
        updated_at: data.updated_at,
      },
    },
    guard.corsHeaders,
  );
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}
