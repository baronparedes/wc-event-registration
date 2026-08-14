import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { logAdminAction } from '@/shared/security.ts';
import { z } from '@/shared/validation.ts';

const bulkRowSchema = z.object({
  first_name: z.string().trim().min(1, 'first_name is required'),
  last_name: z.string().trim().min(1, 'last_name is required'),
  nickname: z.string().trim().optional(),
  email: z.string().trim().email('email must be a valid email address'),
  phone: z.string().trim().optional(),
  public_registration_id: z.string().trim().optional(),
  answers: z.record(z.string(), z.unknown()),
});

const requestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
  rows: z.array(bulkRowSchema).min(1, 'rows must include at least one item'),
  uploaded_field_keys: z.array(z.string()).optional(),
});

type RequestPayload = z.infer<typeof requestSchema>;
type BulkRow = RequestPayload['rows'][number];

type EventFieldRow = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: Array<{ label: string; value: string }> | null;
  validation_rules: Record<string, unknown> | null;
};

type PreparedAnswerForRpc = {
  row_index: number;
  eventFieldId: string;
  answerText: string | null;
  answerNumber: number | null;
  answerBoolean: boolean | null;
  answerDate: string | null;
  answerJson: unknown | null;
};

type NormalizedAnswer = {
  hasValue: boolean;
  answerText: string | null;
  answerNumber: number | null;
  answerBoolean: boolean | null;
  answerDate: string | null;
  answerJson: unknown | null;
  error?: string;
};

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
    return entries.reduce<Record<string, boolean> | null>((acc, [key, rawValue]) => {
      if (!acc) return null;
      const boolValue = parseBoolean(rawValue);
      if (!key.trim() || boolValue === null) return null;
      acc[key.trim()] = boolValue;
      return acc;
    }, {});
  }

  if (typeof value === 'string') {
    const parts = parseList(value);
    return parts.reduce<Record<string, boolean> | null>((acc, part) => {
      if (!acc) return null;
      const separatorIndex = part.indexOf(':');
      if (separatorIndex <= 0) return null;

      const key = part.slice(0, separatorIndex).trim();
      const boolValue = parseBoolean(part.slice(separatorIndex + 1).trim());

      if (!key || boolValue === null) return null;
      acc[key] = boolValue;
      return acc;
    }, {});
  }

  return null;
}

function normalizeAnswer(field: EventFieldRow, rawValue: unknown): NormalizedAnswer {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (field.is_required) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label} is required.`,
      };
    }
    return {
      hasValue: false,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      answerDate: null,
      answerJson: null,
    };
  }

  const rules = field.validation_rules ?? {};
  const optionValues = new Set((field.options ?? []).map((option) => option.value));

  if (field.field_type === 'number') {
    const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: value must be numeric.`,
      };
    }

    const min = typeof rules.min === 'number' ? rules.min : undefined;
    const max = typeof rules.max === 'number' ? rules.max : undefined;
    if (typeof min === 'number' && parsed < min) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: value must be at least ${min}.`,
      };
    }
    if (typeof max === 'number' && parsed > max) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: value must be at most ${max}.`,
      };
    }

    return {
      hasValue: true,
      answerText: null,
      answerNumber: parsed,
      answerBoolean: null,
      answerDate: null,
      answerJson: null,
    };
  }

  if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
    const parsed = parseBoolean(rawValue);
    if (parsed === null) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: value must be true/false.`,
      };
    }

    return {
      hasValue: true,
      answerText: null,
      answerNumber: null,
      answerBoolean: parsed,
      answerDate: null,
      answerJson: null,
    };
  }

  if (field.field_type === 'select' || field.field_type === 'radio') {
    const normalized = String(rawValue).trim();
    if (!normalized) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
      };
    }
    if (optionValues.size > 0 && !optionValues.has(normalized)) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: contains unsupported option value.`,
      };
    }

    return {
      hasValue: true,
      answerText: normalized,
      answerNumber: null,
      answerBoolean: null,
      answerDate: null,
      answerJson: null,
    };
  }

  if (field.field_type === 'multi_select') {
    const selected = parseList(rawValue);
    if (selected.length === 0) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
      };
    }
    if (optionValues.size > 0 && selected.some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: contains unsupported option value(s).`,
      };
    }

    const minSelections =
      typeof rules.min_selections === 'number' ? rules.min_selections : undefined;
    const maxSelections =
      typeof rules.max_selections === 'number' ? rules.max_selections : undefined;
    if (typeof minSelections === 'number' && selected.length < minSelections) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: requires at least ${minSelections} selection(s).`,
      };
    }
    if (typeof maxSelections === 'number' && selected.length > maxSelections) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: allows at most ${maxSelections} selection(s).`,
      };
    }

    return {
      hasValue: true,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      answerDate: null,
      answerJson: selected,
    };
  }

  if (field.field_type === 'multi_select_toggle') {
    const parsedMap = parseToggleMap(rawValue);
    if (!parsedMap || Object.keys(parsedMap).length === 0) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: expected key:true/false pairs.`,
      };
    }
    if (optionValues.size > 0 && Object.keys(parsedMap).some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
        error: `${field.label}: contains unsupported option value(s).`,
      };
    }

    return {
      hasValue: true,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      answerDate: null,
      answerJson: parsedMap,
    };
  }

  if (field.field_type === 'date') {
    const normalized = String(rawValue).trim();
    if (!normalized) {
      return {
        hasValue: false,
        answerText: null,
        answerNumber: null,
        answerBoolean: null,
        answerDate: null,
        answerJson: null,
      };
    }

    return {
      hasValue: true,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      answerDate: normalized,
      answerJson: null,
    };
  }

  // text, textarea, email, phone, datetime, color_picker
  const normalized = String(rawValue).trim();
  if (!normalized) {
    return {
      hasValue: false,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      answerDate: null,
      answerJson: null,
    };
  }

  const minLength = typeof rules.min_length === 'number' ? rules.min_length : undefined;
  const maxLength = typeof rules.max_length === 'number' ? rules.max_length : undefined;
  if (typeof minLength === 'number' && normalized.length < minLength) {
    return {
      hasValue: false,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      answerDate: null,
      answerJson: null,
      error: `${field.label}: must be at least ${minLength} characters.`,
    };
  }
  if (typeof maxLength === 'number' && normalized.length > maxLength) {
    return {
      hasValue: false,
      answerText: null,
      answerNumber: null,
      answerBoolean: null,
      answerDate: null,
      answerJson: null,
      error: `${field.label}: must be at most ${maxLength} characters.`,
    };
  }

  return {
    hasValue: true,
    answerText: normalized,
    answerNumber: null,
    answerBoolean: null,
    answerDate: null,
    answerJson: null,
  };
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'bulk-upsert-public-registrations',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'bulk-upsert-public-registrations',
      windowMs: RATE_LIMIT_PRESETS.bulkUpsertRegistrations.windowMs,
      maxHits: RATE_LIMIT_PRESETS.bulkUpsertRegistrations.maxHits,
    },
    schema: requestSchema,
  });

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { event_id, rows, uploaded_field_keys }: RequestPayload = guard.data;
    const adminClient = guard.client;
    const corsHeaders = guard.corsHeaders;

    const { data: fields, error: fieldsError } = await adminClient
      .from('event_fields')
      .select('id, field_key, label, field_type, is_required, options, validation_rules')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .in('applicability', ['guests', 'both']);

    if (fieldsError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to read registration fields',
        fieldsError.message,
      );
    }

    const safeFields = (fields ?? []) as EventFieldRow[];
    const fieldsByKey = new Map(safeFields.map((field) => [field.field_key, field]));

    const requestedFieldKeySet = new Set(
      (uploaded_field_keys ?? []).map((key) => key.trim()).filter((key) => fieldsByKey.has(key)),
    );
    const targetFields = safeFields.filter((field) => requestedFieldKeySet.has(field.field_key));

    const emailCounts = new Map<string, number>();
    rows.forEach((row) => {
      const key = row.email.trim().toLowerCase();
      emailCounts.set(key, (emailCounts.get(key) ?? 0) + 1);
    });

    const errors: string[] = [];
    type ResolvedRow = { rowIndex: number; emailKey: string; row: BulkRow };
    const resolvedRows: ResolvedRow[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;
      const emailKey = row.email.trim().toLowerCase();

      if ((emailCounts.get(emailKey) ?? 0) > 1) {
        errors.push(`Row ${rowNumber}: email appears multiple times in this CSV batch.`);
        return;
      }

      for (const field of targetFields) {
        const normalized = normalizeAnswer(field, row.answers[field.field_key]);
        if (normalized.error) {
          errors.push(`Row ${rowNumber}: ${normalized.error}`);
        }
      }

      resolvedRows.push({ rowIndex: index, emailKey, row });
    });

    if (errors.length > 0) {
      return errorResponse(corsHeaders, 400, 'CSV validation failed. Import aborted.', undefined, {
        detail: errors.slice(0, 50).join('; '),
        details: errors.slice(0, 50),
        total_errors: errors.length,
      });
    }

    const preparedAnswers: PreparedAnswerForRpc[] = [];
    resolvedRows.forEach(({ rowIndex, row }) => {
      for (const field of targetFields) {
        const normalized = normalizeAnswer(field, row.answers[field.field_key]);
        if (normalized.hasValue) {
          preparedAnswers.push({
            row_index: rowIndex,
            eventFieldId: field.id,
            answerText: normalized.answerText,
            answerNumber: normalized.answerNumber,
            answerBoolean: normalized.answerBoolean,
            answerDate: normalized.answerDate,
            answerJson: normalized.answerJson,
          });
        }
      }
    });

    const rpc = adminClient.rpc.bind(adminClient) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;

    const { data: upsertResult, error: upsertError } = await rpc(
      'apply_bulk_public_registration_upsert',
      {
        p_event_id: event_id,
        p_rows: resolvedRows.map(({ rowIndex, row }) => ({
          row_index: rowIndex,
          first_name: row.first_name.trim(),
          last_name: row.last_name.trim(),
          nickname: row.nickname?.trim() ? row.nickname.trim() : null,
          email: row.email.trim(),
          phone: row.phone?.trim() ? row.phone.trim() : null,
        })),
        p_field_ids: targetFields.map((field) => field.id),
        p_answers: preparedAnswers.map((answer) => ({
          row_index: answer.row_index,
          event_field_id: answer.eventFieldId,
          answer_text: answer.answerText,
          answer_number: answer.answerNumber,
          answer_boolean: answer.answerBoolean,
          answer_date: answer.answerDate,
          answer_json: answer.answerJson,
        })),
      },
    );

    if (upsertError) {
      return errorResponse(
        corsHeaders,
        500,
        upsertError.message || 'Failed to apply public registration import',
      );
    }

    const summary = (Array.isArray(upsertResult) ? upsertResult[0] : upsertResult) as
      | { inserted_count?: number; updated_count?: number }
      | undefined;
    const insertedCount = Number(summary?.inserted_count ?? 0);
    const updatedCount = Number(summary?.updated_count ?? 0);

    if (guard.userId) {
      await logAdminAction({
        adminClient,
        adminUserId: guard.userId,
        action: 'bulk_import_registrations',
        resourceType: 'registration',
        resourceId: event_id,
        metadata: {
          event_id,
          imported_count: resolvedRows.length,
          created_count: insertedCount,
          updated_count: updatedCount,
        },
      });
    }

    return successResponse(corsHeaders, {
      imported_count: insertedCount + updatedCount,
      created_count: insertedCount,
      updated_count: updatedCount,
    });
  } catch (error) {
    console.error('[bulk-upsert-public-registrations] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
});
