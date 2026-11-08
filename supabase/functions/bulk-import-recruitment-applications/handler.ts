import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import type { Json } from '@/shared/database.types.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';

import { type RequestPayload, requestSchema } from './logic.ts';

export async function handleBulkImportRecruitmentApplications(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'bulk-import-recruitment-applications',
    method: 'POST',
    requireAdmin: true,
    requiredPermission: 'canWriteAdminData',
    rateLimit: {
      scope: 'bulk-import-recruitment-applications',
      windowMs: RATE_LIMIT_PRESETS.defaultAdmin.windowMs,
      maxHits: RATE_LIMIT_PRESETS.defaultAdmin.maxHits,
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

    const { data: importResult, error: rpcError } = await adminClient.rpc(
      'apply_bulk_recruitment_import',
      {
        p_rows: rows as unknown as Json,
      },
    );

    if (rpcError) {
      console.error('[bulk-import-recruitment-applications] rpc error', rpcError);
      return errorResponse(
        corsHeaders,
        500,
        rpcError.message || 'Failed to import recruitment applications',
      );
    }

    const summary = Array.isArray(importResult) ? importResult[0] : importResult;
    const insertedCount = Number(summary?.inserted_count ?? 0);
    const skippedCount = Number(summary?.skipped_count ?? 0);

    return successResponse(corsHeaders, {
      success: true,
      inserted_count: insertedCount,
      skipped_count: skippedCount,
      total_count: rows.length,
    });
  } catch (error) {
    console.error('[bulk-import-recruitment-applications] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
}
