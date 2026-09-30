import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { logAdminAction } from '@/shared/security.ts';

import {
  type BulkRow,
  type EventFieldRow,
  IN_FILTER_CHUNK_SIZE,
  type RequestPayload,
  chunkArray,
  normalizeAnswer,
  requestSchema,
} from './utils.ts';

type UserRow = {
  id: string;
  member_id: string;
  is_active: boolean;
};

type PreparedAnswer = {
  rowIndex: number;
  eventFieldId: string;
  answerText: string;
};

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

    const users: UserRow[] = [];
    for (const chunk of chunkArray([...memberIdCounts.keys()], IN_FILTER_CHUNK_SIZE)) {
      const { data: usersData, error: usersError } = await adminClient
        .from('users')
        .select('id, member_id, is_active')
        .in('member_id', chunk);

      if (usersError) {
        return errorResponse(corsHeaders, 500, 'Failed to resolve members', usersError.message);
      }

      users.push(...((usersData ?? []) as UserRow[]));
    }

    const userByMemberId = new Map(users.map((user) => [user.member_id, user]));

    const errors: string[] = [];
    type ResolvedRow = { rowIndex: number; userId: string; row: BulkRow };
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

      resolvedRows.push({ rowIndex: index, userId: user.id, row });
    });

    if (errors.length > 0) {
      return errorResponse(corsHeaders, 400, 'CSV validation failed. Import aborted.', undefined, {
        detail: errors.slice(0, 50).join('; '),
        details: errors.slice(0, 50),
        total_errors: errors.length,
      });
    }

    const preparedAnswers: PreparedAnswer[] = [];
    resolvedRows.forEach(({ rowIndex, row }) => {
      for (const field of targetFields) {
        const normalized = normalizeAnswer(field, row.answers[field.field_key]);
        if (normalized.hasValue && normalized.answerText !== null) {
          preparedAnswers.push({
            rowIndex,
            eventFieldId: field.id,
            answerText: normalized.answerText,
          });
        }
      }
    });

    const rpc = adminClient.rpc.bind(adminClient) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;

    const { data: upsertResult, error: upsertError } = await rpc('apply_bulk_registration_upsert', {
      p_event_id: event_id,
      p_rows: resolvedRows.map(({ rowIndex, userId }) => ({
        row_index: rowIndex,
        user_id: userId,
      })),
      p_field_ids: targetFields.map((field) => field.id),
      p_answers: preparedAnswers.map((answer) => ({
        row_index: answer.rowIndex,
        event_field_id: answer.eventFieldId,
        answer_text: answer.answerText,
      })),
    });

    if (upsertError) {
      return errorResponse(
        corsHeaders,
        500,
        upsertError.message || 'Failed to apply registration import',
      );
    }

    const summary = (Array.isArray(upsertResult) ? upsertResult[0] : upsertResult) as
      | { inserted_count?: number; updated_count?: number }
      | undefined;
    const createdCount = Number(summary?.inserted_count ?? 0);
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
          created_count: createdCount,
          updated_count: updatedCount,
        },
      });
    }

    return successResponse(corsHeaders, {
      imported_count: resolvedRows.length,
      created_count: createdCount,
      updated_count: updatedCount,
    });
  } catch (error) {
    console.error('[bulk-upsert-registrations] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
});
