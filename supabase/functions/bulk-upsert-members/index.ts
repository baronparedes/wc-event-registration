import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';

import { type ExistingMember, type RequestPayload, requestSchema, resolveRows } from './logic.ts';

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'bulk-upsert-members',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'bulk-upsert-members',
      windowMs: RATE_LIMIT_PRESETS.bulkUpsertMembers.windowMs,
      maxHits: RATE_LIMIT_PRESETS.bulkUpsertMembers.maxHits,
    },
    schema: requestSchema,
  });

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { rows }: RequestPayload = guard.data;
    const adminClient = guard.client;
    const corsHeaders = guard.corsHeaders;

    const { data: existingMembers, error: membersError } = await adminClient
      .from('users')
      .select('id, member_id, first_name, last_name, nickname, email');

    if (membersError) {
      return errorResponse(corsHeaders, 500, 'Failed to load existing members');
    }

    const { resolvedRows, errors } = resolveRows(rows, (existingMembers ?? []) as ExistingMember[]);

    if (errors.length > 0) {
      return errorResponse(corsHeaders, 400, 'CSV validation failed. Import aborted.', undefined, {
        detail: errors.slice(0, 50).join('; '),
        details: errors.slice(0, 50),
        total_errors: errors.length,
      });
    }

    const { data: upsertResult, error: upsertError } = await adminClient.rpc(
      'apply_bulk_member_upsert',
      {
        p_rows: resolvedRows,
      },
    );

    if (upsertError) {
      return errorResponse(
        corsHeaders,
        500,
        upsertError.message || 'Failed to apply member import',
      );
    }

    const summary = Array.isArray(upsertResult) ? upsertResult[0] : upsertResult;
    const insertedCount = Number(summary?.inserted_count ?? 0);
    const updatedCount = Number(summary?.updated_count ?? 0);

    return successResponse(corsHeaders, {
      inserted_count: insertedCount,
      updated_count: updatedCount,
      imported_count: insertedCount + updatedCount,
    });
  } catch (error) {
    console.error('[bulk-upsert-members] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
});
