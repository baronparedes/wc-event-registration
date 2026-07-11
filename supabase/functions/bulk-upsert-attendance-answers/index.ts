import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
  requireAdminAccess,
} from '@/shared/security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from '@/shared/validation.ts';

const bulkRowSchema = z
  .object({
    attendee_kind: z.enum(['registered', 'public']),
    registration_id: z.string().uuid().optional(),
    public_registration_id: z.string().uuid().optional(),
    answers: z.record(z.string(), z.unknown()),
  })
  .superRefine((value, context) => {
    if (value.attendee_kind === 'registered' && !value.registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['registration_id'],
        message: 'registration_id is required for registered rows.',
      });
    }

    if (value.attendee_kind === 'public' && !value.public_registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['public_registration_id'],
        message: 'public_registration_id is required for public rows.',
      });
    }
  });

const requestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
  rows: z.array(bulkRowSchema).min(1, 'rows must include at least one item'),
});

type RequestPayload = z.infer<typeof requestSchema>;

type AttendanceFieldRow = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: Array<{ label: string; value: string }> | null;
  validation_rules: Record<string, unknown> | null;
};

type RegistrationRefRow = {
  id: string;
};

type PublicRegistrationRefRow = {
  id: string;
};

type PreparedAnswerRow = {
  attendee_kind: 'registered' | 'public';
  registration_id?: string;
  public_registration_id?: string;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
};

const allowedOrigins = readAllowedOrigins();

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes' || normalized === '1') return true;
    if (normalized === 'false' || normalized === 'no' || normalized === '0') return false;
  }

  return null;
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter((item) => item.length > 0);
  }

  if (typeof value === 'string') {
    return value
      .split(/[|;]/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  return [];
}

function parseToggleMap(value: unknown): Record<string, boolean> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    const parsed = entries.reduce<Record<string, boolean> | null>((acc, [key, rawValue]) => {
      if (!acc) return null;
      const boolValue = parseBoolean(rawValue);
      if (!key.trim() || boolValue === null) return null;
      acc[key.trim()] = boolValue;
      return acc;
    }, {});

    return parsed;
  }

  if (typeof value === 'string') {
    const parts = parseList(value);
    const parsed = parts.reduce<Record<string, boolean> | null>((acc, part) => {
      if (!acc) return null;
      const separatorIndex = part.indexOf(':');
      if (separatorIndex <= 0) return null;

      const key = part.slice(0, separatorIndex).trim();
      const rawBool = part.slice(separatorIndex + 1).trim();
      const boolValue = parseBoolean(rawBool);

      if (!key || boolValue === null) return null;
      acc[key] = boolValue;
      return acc;
    }, {});

    return parsed;
  }

  return null;
}

function validateAndNormalizeAnswer(
  field: AttendanceFieldRow,
  rawValue: unknown,
): { hasValue: boolean; answer_text: string | null; answer_number: number | null; error?: string } {
  const rawRules = field.validation_rules ?? {};
  const rules = {
    ...rawRules,
    ...(typeof rawRules.max === 'number' && rawRules.max <= 0 ? { max: undefined } : {}),
    ...(typeof rawRules.max_length === 'number' && rawRules.max_length <= 0
      ? { max_length: undefined }
      : {}),
    ...(typeof rawRules.max_selections === 'number' && rawRules.max_selections <= 0
      ? { max_selections: undefined }
      : {}),
  };

  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return { hasValue: false, answer_text: null, answer_number: null };
  }

  const optionValues = new Set((field.options ?? []).map((option) => option.value));

  if (field.field_type === 'number') {
    const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: value must be numeric.`,
      };
    }

    const min = typeof rules.min === 'number' ? rules.min : undefined;
    const max = typeof rules.max === 'number' ? rules.max : undefined;

    if (typeof min === 'number' && parsed < min) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: value must be at least ${min}.`,
      };
    }

    if (typeof max === 'number' && parsed > max) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: value must be at most ${max}.`,
      };
    }

    return { hasValue: true, answer_text: null, answer_number: parsed };
  }

  if (field.field_type === 'multi_select') {
    const selected = parseList(rawValue);

    if (selected.length === 0) {
      return { hasValue: false, answer_text: null, answer_number: null };
    }

    if (optionValues.size > 0 && selected.some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: contains unsupported option values.`,
      };
    }

    const minSelections =
      typeof rules.min_selections === 'number' ? Math.floor(rules.min_selections) : undefined;
    const maxSelections =
      typeof rules.max_selections === 'number' ? Math.floor(rules.max_selections) : undefined;

    if (typeof minSelections === 'number' && selected.length < minSelections) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: requires at least ${minSelections} selection(s).`,
      };
    }

    if (typeof maxSelections === 'number' && selected.length > maxSelections) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: allows at most ${maxSelections} selection(s).`,
      };
    }

    return {
      hasValue: true,
      answer_text: JSON.stringify(selected),
      answer_number: null,
    };
  }

  if (field.field_type === 'multi_select_toggle') {
    const parsedMap = parseToggleMap(rawValue);

    if (!parsedMap || Object.keys(parsedMap).length === 0) {
      return { hasValue: false, answer_text: null, answer_number: null };
    }

    if (optionValues.size > 0 && Object.keys(parsedMap).some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: contains unsupported option values.`,
      };
    }

    return {
      hasValue: true,
      answer_text: JSON.stringify(parsedMap),
      answer_number: null,
    };
  }

  if (field.field_type === 'select' || field.field_type === 'radio') {
    const normalized = String(rawValue).trim();
    if (!normalized) {
      return { hasValue: false, answer_text: null, answer_number: null };
    }

    if (optionValues.size > 0 && !optionValues.has(normalized)) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: contains unsupported option value.`,
      };
    }

    return { hasValue: true, answer_text: normalized, answer_number: null };
  }

  if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
    const parsed = parseBoolean(rawValue);
    if (parsed === null) {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: value must be true/false.`,
      };
    }

    return { hasValue: true, answer_text: parsed ? 'true' : 'false', answer_number: null };
  }

  const normalized = String(rawValue).trim();
  if (!normalized) {
    return { hasValue: false, answer_text: null, answer_number: null };
  }

  const minLength = typeof rules.min_length === 'number' ? Math.floor(rules.min_length) : undefined;
  const maxLength = typeof rules.max_length === 'number' ? Math.floor(rules.max_length) : undefined;
  const pattern = typeof rules.pattern === 'string' ? rules.pattern : undefined;

  if (typeof minLength === 'number' && normalized.length < minLength) {
    return {
      hasValue: false,
      answer_text: null,
      answer_number: null,
      error: `${field.label}: must be at least ${minLength} characters.`,
    };
  }

  if (typeof maxLength === 'number' && normalized.length > maxLength) {
    return {
      hasValue: false,
      answer_text: null,
      answer_number: null,
      error: `${field.label}: must be at most ${maxLength} characters.`,
    };
  }

  if (pattern) {
    try {
      const regex = new RegExp(pattern);
      if (!regex.test(normalized)) {
        return {
          hasValue: false,
          answer_text: null,
          answer_number: null,
          error: `${field.label}: format is invalid.`,
        };
      }
    } catch {
      return {
        hasValue: false,
        answer_text: null,
        answer_number: null,
        error: `${field.label}: field validation pattern is invalid in configuration.`,
      };
    }
  }

  return { hasValue: true, answer_text: normalized, answer_number: null };
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

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

  try {
    const env = parseFunctionEnvironment();
    if (!env) {
      return new Response(JSON.stringify({ success: false, error: 'Environment not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsedBody = await parseRequestBody(req, requestSchema);
    if (!parsedBody.success) {
      return new Response(
        JSON.stringify({ success: false, error: parsedBody.error, detail: parsedBody.details }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { event_id, rows }: RequestPayload = parsedBody.data;

    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'bulk-upsert-attendance-answers',
      supabaseUrl: env.supabaseUrl,
      supabaseServiceKey: env.supabaseServiceKey,
      authHeader: req.headers.get('authorization'),
      corsHeaders,
      rateLimit: {
        scope: 'bulk-upsert-attendance-answers',
        windowMs: 60_000,
        maxHits: 6,
      },
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const adminClient = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: settingsData, error: settingsError } = await adminClient
      .from('attendance_settings')
      .select('attendance_enabled')
      .eq('event_id', event_id)
      .maybeSingle();

    if (settingsError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read attendance settings' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!settingsData?.attendance_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Attendance tracking is disabled for this event' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: fields, error: fieldError } = await adminClient
      .from('attendance_fields')
      .select('id, field_key, label, field_type, is_required, options, validation_rules')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (fieldError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read attendance fields' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const safeFields = (fields ?? []) as AttendanceFieldRow[];
    if (safeFields.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No active attendance fields are configured' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const fieldsByKey = new Map(safeFields.map((field) => [field.field_key, field]));

    const registrationIds = rows
      .filter((row) => row.attendee_kind === 'registered')
      .map((row) => row.registration_id as string);

    const publicRegistrationIds = rows
      .filter((row) => row.attendee_kind === 'public')
      .map((row) => row.public_registration_id as string);

    const { data: validRegistrations, error: validRegistrationsError } =
      registrationIds.length > 0
        ? await adminClient
            .from('registrations')
            .select('id')
            .eq('event_id', event_id)
            .in('id', registrationIds)
            .in('status', ['submitted', 'updated'])
        : { data: [], error: null };

    if (validRegistrationsError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to validate registrations' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: validPublicRegistrations, error: validPublicError } =
      publicRegistrationIds.length > 0
        ? await adminClient
            .from('public_registrations')
            .select('id')
            .eq('event_id', event_id)
            .in('id', publicRegistrationIds)
            .neq('status', 'cancelled')
        : { data: [], error: null };

    if (validPublicError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to validate public registrations' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const validRegistrationIdSet = new Set(
      ((validRegistrations ?? []) as RegistrationRefRow[]).map((row) => row.id),
    );
    const validPublicRegistrationIdSet = new Set(
      ((validPublicRegistrations ?? []) as PublicRegistrationRefRow[]).map((row) => row.id),
    );

    const errors: string[] = [];
    const preparedAnswerRows: PreparedAnswerRow[] = [];

    rows.forEach((row, rowIndex) => {
      const rowNumber = rowIndex + 1;

      if (row.attendee_kind === 'registered') {
        const registrationId = row.registration_id as string;
        if (!validRegistrationIdSet.has(registrationId)) {
          errors.push(
            `Row ${rowNumber}: registration_id does not belong to this event or is not active.`,
          );
          return;
        }
      }

      if (row.attendee_kind === 'public') {
        const publicRegistrationId = row.public_registration_id as string;
        if (!validPublicRegistrationIdSet.has(publicRegistrationId)) {
          errors.push(
            `Row ${rowNumber}: public_registration_id does not belong to this event or is cancelled.`,
          );
          return;
        }
      }

      const answerKeys = Object.keys(row.answers ?? {});
      const unknownKeys = answerKeys.filter((key) => !fieldsByKey.has(key));
      if (unknownKeys.length > 0) {
        errors.push(`Row ${rowNumber}: unsupported field key(s): ${unknownKeys.join(', ')}.`);
        return;
      }

      for (const field of safeFields) {
        const normalized = validateAndNormalizeAnswer(field, row.answers[field.field_key]);

        if (normalized.error) {
          errors.push(`Row ${rowNumber}: ${normalized.error}`);
          continue;
        }

        if (!normalized.hasValue) {
          continue;
        }

        preparedAnswerRows.push({
          attendee_kind: row.attendee_kind,
          registration_id: row.registration_id,
          public_registration_id: row.public_registration_id,
          attendance_field_id: field.id,
          answer_text: normalized.answer_text,
          answer_number: normalized.answer_number,
        });
      }
    });

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'CSV validation failed. Import aborted.',
          detail: errors.slice(0, 50).join('; '),
          details: errors.slice(0, 50),
          total_errors: errors.length,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const fieldIds = safeFields.map((field) => field.id);

    if (registrationIds.length > 0 && fieldIds.length > 0) {
      const { error: deleteRegisteredError } = await adminClient
        .from('attendance_answers')
        .delete()
        .in('registration_id', registrationIds)
        .in('attendance_field_id', fieldIds);

      if (deleteRegisteredError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to clear existing registered answers' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    if (publicRegistrationIds.length > 0 && fieldIds.length > 0) {
      const { error: deletePublicError } = await adminClient
        .from('public_attendance_answers')
        .delete()
        .in('public_registration_id', publicRegistrationIds)
        .in('attendance_field_id', fieldIds);

      if (deletePublicError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to clear existing public answers' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    const registeredInsertRows = preparedAnswerRows
      .filter((row) => row.attendee_kind === 'registered' && row.registration_id)
      .map((row) => ({
        id: crypto.randomUUID(),
        registration_id: row.registration_id,
        attendance_field_id: row.attendance_field_id,
        answer_text: row.answer_text,
        answer_number: row.answer_number,
      }));

    if (registeredInsertRows.length > 0) {
      const { error: insertRegisteredError } = await adminClient
        .from('attendance_answers')
        .insert(registeredInsertRows);

      if (insertRegisteredError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to write registered attendance answers',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    const publicInsertRows = preparedAnswerRows
      .filter((row) => row.attendee_kind === 'public' && row.public_registration_id)
      .map((row) => ({
        id: crypto.randomUUID(),
        public_registration_id: row.public_registration_id,
        attendance_field_id: row.attendance_field_id,
        answer_text: row.answer_text,
        answer_number: row.answer_number,
      }));

    if (publicInsertRows.length > 0) {
      const { error: insertPublicError } = await adminClient
        .from('public_attendance_answers')
        .insert(publicInsertRows);

      if (insertPublicError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to write public attendance answers' }),
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
        imported_count: rows.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[bulk-upsert-attendance-answers] unhandled error', error);
    return new Response(JSON.stringify({ success: false, error: 'Unexpected server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
