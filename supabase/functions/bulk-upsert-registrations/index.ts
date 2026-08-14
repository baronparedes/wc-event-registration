import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { logAdminAction } from '@/shared/security.ts';
import { z } from '@/shared/validation.ts';

const bulkRowSchema = z.object({
  member_id: z.string().trim().min(1, 'member_id is required'),
  registration_id: z.string().trim().optional(),
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

type UserRow = {
  id: string;
  member_id: string;
  is_active: boolean;
};

type RegistrationRow = {
  id: string;
  user_id: string;
  status: string;
};

type PreparedAnswer = {
  registrationId: string;
  eventFieldId: string;
  answerText: string;
};

const IN_FILTER_CHUNK_SIZE = 200;

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

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

/** Normalizes an answer value into the same answer_text encoding used by persistAnswers. */
function normalizeAnswer(
  field: EventFieldRow,
  rawValue: unknown,
): { hasValue: boolean; answerText: string | null; error?: string } {
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    if (field.is_required) {
      return { hasValue: false, answerText: null, error: `${field.label} is required.` };
    }
    return { hasValue: false, answerText: null };
  }

  const rules = field.validation_rules ?? {};
  const optionValues = new Set((field.options ?? []).map((option) => option.value));

  if (field.field_type === 'number') {
    const parsed = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return { hasValue: false, answerText: null, error: `${field.label}: value must be numeric.` };
    }

    const min = typeof rules.min === 'number' ? rules.min : undefined;
    const max = typeof rules.max === 'number' ? rules.max : undefined;
    if (typeof min === 'number' && parsed < min) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: value must be at least ${min}.`,
      };
    }
    if (typeof max === 'number' && parsed > max) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: value must be at most ${max}.`,
      };
    }

    return { hasValue: true, answerText: String(parsed) };
  }

  if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
    const parsed = parseBoolean(rawValue);
    if (parsed === null) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: value must be true/false.`,
      };
    }
    return { hasValue: true, answerText: parsed ? 'true' : 'false' };
  }

  if (field.field_type === 'select' || field.field_type === 'radio') {
    const normalized = String(rawValue).trim();
    if (!normalized) {
      return { hasValue: false, answerText: null };
    }
    if (optionValues.size > 0 && !optionValues.has(normalized)) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: contains unsupported option value.`,
      };
    }
    return { hasValue: true, answerText: normalized };
  }

  if (field.field_type === 'multi_select') {
    const selected = parseList(rawValue);
    if (selected.length === 0) {
      return { hasValue: false, answerText: null };
    }
    if (optionValues.size > 0 && selected.some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answerText: null,
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
        error: `${field.label}: requires at least ${minSelections} selection(s).`,
      };
    }
    if (typeof maxSelections === 'number' && selected.length > maxSelections) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: allows at most ${maxSelections} selection(s).`,
      };
    }

    return { hasValue: true, answerText: JSON.stringify(selected) };
  }

  if (field.field_type === 'multi_select_toggle') {
    const parsedMap = parseToggleMap(rawValue);
    if (!parsedMap || Object.keys(parsedMap).length === 0) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: expected key:true/false pairs.`,
      };
    }
    if (optionValues.size > 0 && Object.keys(parsedMap).some((value) => !optionValues.has(value))) {
      return {
        hasValue: false,
        answerText: null,
        error: `${field.label}: contains unsupported option value(s).`,
      };
    }

    return { hasValue: true, answerText: JSON.stringify(parsedMap) };
  }

  // text, textarea, email, phone, date, datetime, color_picker
  const normalized = String(rawValue).trim();
  if (!normalized) {
    return { hasValue: false, answerText: null };
  }

  const minLength = typeof rules.min_length === 'number' ? rules.min_length : undefined;
  const maxLength = typeof rules.max_length === 'number' ? rules.max_length : undefined;
  if (typeof minLength === 'number' && normalized.length < minLength) {
    return {
      hasValue: false,
      answerText: null,
      error: `${field.label}: must be at least ${minLength} characters.`,
    };
  }
  if (typeof maxLength === 'number' && normalized.length > maxLength) {
    return {
      hasValue: false,
      answerText: null,
      error: `${field.label}: must be at most ${maxLength} characters.`,
    };
  }

  return { hasValue: true, answerText: normalized };
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'bulk-upsert-registrations',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'bulk-upsert-registrations',
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
      .eq('is_active', true);

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

    const memberIdCounts = new Map<string, number>();
    rows.forEach((row) => {
      memberIdCounts.set(row.member_id, (memberIdCounts.get(row.member_id) ?? 0) + 1);
    });

    const uniqueMemberIds = [...memberIdCounts.keys()];
    const users: UserRow[] = [];
    for (const chunk of chunkArray(uniqueMemberIds, IN_FILTER_CHUNK_SIZE)) {
      const { data: chunkUsers, error: usersError } = await adminClient
        .from('users')
        .select('id, member_id, is_active')
        .in('member_id', chunk);

      if (usersError) {
        return errorResponse(corsHeaders, 500, 'Failed to resolve members', usersError.message);
      }

      users.push(...((chunkUsers ?? []) as UserRow[]));
    }

    const userByMemberId = new Map(users.map((user) => [user.member_id, user]));

    const resolvedUserIds = [...userByMemberId.values()].map((user) => user.id);
    const existingRegistrations: RegistrationRow[] = [];
    for (const chunk of chunkArray(resolvedUserIds, IN_FILTER_CHUNK_SIZE)) {
      if (chunk.length === 0) continue;

      const { data: chunkRegistrations, error: existingRegistrationsError } = await adminClient
        .from('registrations')
        .select('id, user_id, status')
        .eq('event_id', event_id)
        .in('user_id', chunk);

      if (existingRegistrationsError) {
        return errorResponse(
          corsHeaders,
          500,
          'Failed to read existing registrations',
          existingRegistrationsError.message,
        );
      }

      existingRegistrations.push(...((chunkRegistrations ?? []) as RegistrationRow[]));
    }

    const registrationByUserId = new Map(
      existingRegistrations.map((registration) => [registration.user_id, registration]),
    );

    const errors: string[] = [];
    type ResolvedRow = { userId: string; row: BulkRow };
    const resolvedRows: ResolvedRow[] = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2;

      if ((memberIdCounts.get(row.member_id) ?? 0) > 1) {
        errors.push(`Row ${rowNumber}: member_id appears multiple times in this CSV batch.`);
        return;
      }

      const user = userByMemberId.get(row.member_id);
      if (!user || !user.is_active) {
        errors.push(`Row ${rowNumber}: member_id "${row.member_id}" was not found.`);
        return;
      }

      for (const field of targetFields) {
        const normalized = normalizeAnswer(field, row.answers[field.field_key]);
        if (normalized.error) {
          errors.push(`Row ${rowNumber}: ${normalized.error}`);
        }
      }

      resolvedRows.push({ userId: user.id, row });
    });

    if (errors.length > 0) {
      return errorResponse(corsHeaders, 400, 'CSV validation failed. Import aborted.', undefined, {
        detail: errors.slice(0, 50).join('; '),
        details: errors.slice(0, 50),
        total_errors: errors.length,
      });
    }

    const rowsToInsert = resolvedRows.filter(({ userId }) => !registrationByUserId.has(userId));
    const rowsToUpdate = resolvedRows.filter(({ userId }) => registrationByUserId.has(userId));

    const insertedRegistrationIdByUserId = new Map<string, string>();
    if (rowsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await adminClient
        .from('registrations')
        .insert(
          rowsToInsert.map(({ userId }) => ({
            event_id,
            user_id: userId,
            status: 'submitted',
            source: 'admin_bulk_import',
          })),
        )
        .select('id, user_id');

      if (insertError) {
        return errorResponse(
          corsHeaders,
          500,
          'Failed to create registrations',
          insertError.message,
        );
      }

      for (const row of (inserted ?? []) as Array<{ id: string; user_id: string }>) {
        insertedRegistrationIdByUserId.set(row.user_id, row.id);
      }
    }

    if (rowsToUpdate.length > 0) {
      const registrationIdsToUpdate = rowsToUpdate.map(
        ({ userId }) => registrationByUserId.get(userId)!.id,
      );
      for (const chunk of chunkArray(registrationIdsToUpdate, IN_FILTER_CHUNK_SIZE)) {
        const { error: updateError } = await adminClient
          .from('registrations')
          .update({ status: 'updated', submitted_at: new Date().toISOString() })
          .in('id', chunk);

        if (updateError) {
          return errorResponse(
            corsHeaders,
            500,
            'Failed to update registrations',
            updateError.message,
          );
        }
      }
    }

    if (targetFields.length > 0) {
      const registrationIdByUserId = new Map<string, string>([
        ...insertedRegistrationIdByUserId,
        ...[...registrationByUserId.entries()].map(
          ([userId, registration]) => [userId, registration.id] as [string, string],
        ),
      ]);

      const allRegistrationIds = [...registrationIdByUserId.values()];
      const fieldIds = targetFields.map((field) => field.id);

      for (const chunk of chunkArray(allRegistrationIds, IN_FILTER_CHUNK_SIZE)) {
        const { error: deleteError } = await adminClient
          .from('registration_answers')
          .delete()
          .in('registration_id', chunk)
          .in('event_field_id', fieldIds);

        if (deleteError) {
          return errorResponse(
            corsHeaders,
            500,
            'Failed to clear existing answers',
            deleteError.message,
          );
        }
      }

      const preparedAnswers: PreparedAnswer[] = [];
      resolvedRows.forEach(({ userId, row }) => {
        const registrationId = registrationIdByUserId.get(userId);
        if (!registrationId) return;

        for (const field of targetFields) {
          const normalized = normalizeAnswer(field, row.answers[field.field_key]);
          if (normalized.hasValue && normalized.answerText !== null) {
            preparedAnswers.push({
              registrationId,
              eventFieldId: field.id,
              answerText: normalized.answerText,
            });
          }
        }
      });

      if (preparedAnswers.length > 0) {
        const { error: insertAnswersError } = await adminClient.from('registration_answers').insert(
          preparedAnswers.map((answer) => ({
            registration_id: answer.registrationId,
            event_field_id: answer.eventFieldId,
            answer_text: answer.answerText,
          })),
        );

        if (insertAnswersError) {
          return errorResponse(
            corsHeaders,
            500,
            'Failed to write registration answers',
            insertAnswersError.message,
          );
        }
      }
    }

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
          created_count: rowsToInsert.length,
          updated_count: rowsToUpdate.length,
        },
      });
    }

    return successResponse(corsHeaders, {
      imported_count: resolvedRows.length,
      created_count: rowsToInsert.length,
      updated_count: rowsToUpdate.length,
    });
  } catch (error) {
    console.error('[bulk-upsert-registrations] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
});
